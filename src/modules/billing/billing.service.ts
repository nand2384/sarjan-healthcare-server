import { AppError, ErrorCode } from "@errors";
import { AuditAction, AuditEntityType, Prisma } from "@generated/prisma/client";
import { AuditService } from "@modules/audit/audit.service";
import { MailerService } from "mailer";
import { BillingRepository } from "./billing.repository";
import { CreateTestCatalogDto, UpdateTestCatalogDto, UpdateDoctorFeesDto, CheckoutPaymentMethod } from "./billing.dto";

type AuditContext = { performed_by_staff_id: number; ip_address?: string; user_agent?: string };

export class BillingService {
    constructor(
        private readonly billingRepository: BillingRepository,
        private readonly auditService: AuditService,
        private readonly mailerService: MailerService,
    ) {}

    // --- Test Catalog ---

    public async getActiveTestCatalog() {
        return this.billingRepository.getActiveTestCatalog();
    }

    public async getAllAdminTestCatalog() {
        return this.billingRepository.getAllAdminTestCatalog();
    }

    public async createTestCatalog(data: CreateTestCatalogDto, auditContext: AuditContext) {
        const result = await this.billingRepository.createTestCatalog(data);

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.BILLING,
            entity_id: `TEST_CATALOG_${result.test_catalog_id}`,
            action: AuditAction.CREATE,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        return result;
    }

    public async updateTestCatalog(id: number, data: UpdateTestCatalogDto, auditContext: AuditContext) {
        const oldTest = await this.billingRepository.getTestCatalogById(id);
        if (!oldTest) throw new AppError(404, ErrorCode.NOT_FOUND, "Test not found.");

        const result = await this.billingRepository.updateTestCatalog(id, data);

        let action: AuditAction = AuditAction.UPDATE;
        if (data.is_active === true && !oldTest.is_active) action = AuditAction.ENABLE;
        else if (data.is_active === false && oldTest.is_active) action = AuditAction.DISABLE;

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.BILLING,
            entity_id: `TEST_CATALOG_${result.test_catalog_id}`,
            action,
            old_values: oldTest as unknown as Prisma.InputJsonValue,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        return result;
    }

    public async deleteTestCatalog(id: number, auditContext: AuditContext) {
        const oldTest = await this.billingRepository.getTestCatalogById(id);
        if (!oldTest) throw new AppError(404, ErrorCode.NOT_FOUND, "Test not found.");

        const result = await this.billingRepository.deleteTestCatalog(id);

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.BILLING,
            entity_id: `TEST_CATALOG_${result.test_catalog_id}`,
            action: AuditAction.DELETE,
            old_values: oldTest as unknown as Prisma.InputJsonValue,
        });

        return result;
    }

    // --- Doctor Fees ---

    public async getDoctorsWithFees() {
        return this.billingRepository.getDoctorsWithFees();
    }

    public async updateDoctorFees(staffId: number, data: UpdateDoctorFeesDto, auditContext: AuditContext) {
        const oldProfile = await this.billingRepository.getDoctorProfileByStaffId(staffId);
        if (!oldProfile) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor profile not found.");

        const result = await this.billingRepository.updateDoctorFees(staffId, data);

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.BILLING,
            entity_id: `DOCTOR_FEES_${staffId}`,
            action: AuditAction.UPDATE,
            old_values: {
                old_case_fee: oldProfile.old_case_fee,
                new_case_fee: oldProfile.new_case_fee,
            } as unknown as Prisma.InputJsonValue,
            new_values: {
                old_case_fee: result.old_case_fee,
                new_case_fee: result.new_case_fee,
            } as unknown as Prisma.InputJsonValue,
        });

        return result;
    }

    // --- Checkout ---

    // Determines the consultation fee to charge for this patient/doctor pair, and blocks checkout
    // with an admin alert if the doctor's fees haven't been configured yet (see DoctorProfile schema
    // comment — 0 is the unset-placeholder value, never a valid real fee).
    private async resolveConsultationFee(patientId: number, doctorStaffId: number) {
        const doctorProfile = await this.billingRepository.getDoctorProfileByStaffId(doctorStaffId);
        if (!doctorProfile) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor profile not found.");

        const oldFee = Number(doctorProfile.old_case_fee);
        const newFee = Number(doctorProfile.new_case_fee);

        if (oldFee === 0 || newFee === 0) {
            const doctor = await this.billingRepository.getStaffNameById(doctorStaffId);
            const admins = await this.billingRepository.getActiveAdminEmails();
            const doctorName = doctor ? `${doctor.first_name} ${doctor.last_name}` : `Staff #${doctorStaffId}`;

            await Promise.all(
                admins.map((admin) =>
                    this.mailerService.sendDoctorFeeMissingAlert({ to: admin.email, doctorName }).catch(() => {
                        // Best-effort notification — a mail provider hiccup shouldn't also break checkout error reporting.
                    })
                )
            );

            throw new AppError(409, ErrorCode.CONFLICT, "This doctor's consultation fees are not configured yet. Admin has been notified.");
        }

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const lastVisit = await this.billingRepository.findLastCompletedVisit(patientId, doctorStaffId, threeMonthsAgo);
        const feeType: "OLD" | "NEW" = lastVisit ? "OLD" : "NEW";
        const fee = feeType === "OLD" ? oldFee : newFee;

        return { fee, feeType };
    }

    public async getCheckoutInfo(appointmentId: number) {
        const appointment = await this.billingRepository.getAppointmentForCheckout(appointmentId);
        if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found.");

        const { fee, feeType } = await this.resolveConsultationFee(appointment.patient_id, appointment.doctor_staff_id);
        const orderedTests = await this.billingRepository.getOrderedTestsForAppointment(appointmentId);
        const testCatalog = await this.billingRepository.getActiveTestCatalog();

        return {
            consultation_fee: fee,
            consultation_fee_type: feeType,
            ordered_tests: orderedTests.map((order) => ({
                test_order_id: order.test_order_id,
                test_catalog_id: order.test_catalog_id,
                test_name: order.test_catalog.test_name,
                price: order.test_catalog.price,
            })),
            test_catalog: testCatalog,
        };
    }

    public async checkout(
        appointmentId: number,
        staffId: number,
        additionalTestCatalogIds: number[],
        paymentMethod: CheckoutPaymentMethod,
        auditContext: AuditContext,
    ) {
        const appointment = await this.billingRepository.getAppointmentForCheckout(appointmentId);
        if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found.");
        if (![13, 14].includes(appointment.appointment_status_id)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Appointment is not ready for checkout.");
        }

        const { fee, feeType } = await this.resolveConsultationFee(appointment.patient_id, appointment.doctor_staff_id);

        const result = await this.billingRepository.checkoutTx(
            appointmentId,
            appointment.patient_id,
            staffId,
            additionalTestCatalogIds,
            paymentMethod,
            fee,
            feeType,
        );

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.BILLING,
            entity_id: `PAYMENT_${result.payment.payment_id}`,
            action: AuditAction.CREATE,
            new_values: result.payment as unknown as Prisma.InputJsonValue,
        });

        return result;
    }
}
