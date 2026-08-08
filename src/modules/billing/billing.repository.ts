import { PrismaClient, Prisma } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";
import { CreateTestCatalogDto, UpdateTestCatalogDto, UpdateDoctorFeesDto, CheckoutPaymentMethod } from "./billing.dto";

export class BillingRepository {
    constructor(private readonly prisma: PrismaClient) {}

    // A patient is billed at the "old case" (returning) rate if they have a completed appointment
    // with this same doctor on or after sinceDate (the caller passes "3 months ago"); otherwise
    // they're billed at the "new case" rate.
    public async findLastCompletedVisit(patientId: number, doctorStaffId: number, sinceDate: Date) {
        return this.prisma.appointment.findFirst({
            where: {
                patient_id: patientId,
                doctor_staff_id: doctorStaffId,
                appointment_status_id: 6, // COMPLETED
                appointment_date: { gte: sinceDate }
            },
            orderBy: { appointment_date: 'desc' }
        });
    }

    // --- Test Catalog (receptionist-facing read) ---

    public async getActiveTestCatalog(tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.testCatalog.findMany({
            where: { is_active: true, deleted_at: null },
            orderBy: { display_order: "asc" },
        });
    }

    // --- Test Catalog Admin CRUD ---

    public async getAllAdminTestCatalog(tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.testCatalog.findMany({
            where: { deleted_at: null },
            orderBy: { display_order: "asc" },
        });
    }

    public async createTestCatalog(data: CreateTestCatalogDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;

        const count = await prisma.testCatalog.count({ where: { deleted_at: null } });

        return prisma.testCatalog.create({
            data: {
                test_name: data.test_name,
                price: data.price,
                is_active: data.is_active ?? true,
                display_order: count + 1,
            }
        });
    }

    public async getTestCatalogById(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.testCatalog.findUnique({
            where: { test_catalog_id: id, deleted_at: null }
        });
    }

    public async updateTestCatalog(id: number, data: UpdateTestCatalogDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.testCatalog.update({
            where: { test_catalog_id: id },
            data: { ...data }
        });
    }

    public async deleteTestCatalog(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.testCatalog.update({
            where: { test_catalog_id: id },
            data: { deleted_at: new Date(), is_active: false }
        });
    }

    // --- Doctor Fees ---

    public async getDoctorsWithFees(tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.staff.findMany({
            where: {
                deleted_at: null,
                staff_roles: { some: { role_id: 2 } } // Role ID 2 is Doctor
            },
            orderBy: { first_name: "asc" },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                doctor_profile: {
                    select: {
                        old_case_fee: true,
                        new_case_fee: true,
                    }
                }
            }
        });
    }

    public async getDoctorProfileByStaffId(staffId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.doctorProfile.findUnique({
            where: { staff_id: staffId }
        });
    }

    public async updateDoctorFees(staffId: number, data: UpdateDoctorFeesDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.doctorProfile.update({
            where: { staff_id: staffId },
            data: {
                old_case_fee: data.old_case_fee,
                new_case_fee: data.new_case_fee,
            }
        });
    }

    // --- Send for Tests ---

    public async sendForTestsTx(appointmentId: number, testCatalogIds: number[], staffId: number) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId }
            });
            if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found");
            if (![5, 12, 13].includes(appointment.appointment_status_id)) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "Tests can only be sent while the patient is checked-in, in consultation, or awaiting reports.");
            }

            const activeTests = await tx.testCatalog.findMany({
                where: { test_catalog_id: { in: testCatalogIds }, is_active: true, deleted_at: null }
            });
            if (activeTests.length !== testCatalogIds.length) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "One or more selected tests are invalid or inactive.");
            }

            const testOrders = await Promise.all(
                testCatalogIds.map((testCatalogId) =>
                    tx.testOrder.create({
                        data: {
                            patient_id: appointment.patient_id,
                            appointment_id: appointmentId,
                            test_catalog_id: testCatalogId,
                            ordered_by_staff_id: staffId,
                        }
                    })
                )
            );

            const updatedAppointment = await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: { appointment_status_id: 13 } // WAITING_REPORTS
            });

            await tx.appointmentWorkflowHistory.create({
                data: {
                    appointment_id: appointmentId,
                    appointment_workflow_status_id: 13,
                    changed_by_staff_id: staffId,
                    remarks: "Sent for tests.",
                }
            });

            return { appointment: updatedAppointment, testOrders };
        });
    }

    // --- Checkout ---

    public async getAppointmentForCheckout(appointmentId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.appointment.findUnique({
            where: { appointment_id: appointmentId },
            select: {
                appointment_id: true,
                patient_id: true,
                doctor_staff_id: true,
                appointment_status_id: true,
                review_token: true,
                patient: { select: { first_name: true, last_name: true, whatsapp_number: true } },
                doctor: { select: { first_name: true, last_name: true } },
            }
        });
    }

    public async getOrderedTestsForAppointment(appointmentId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.testOrder.findMany({
            where: { appointment_id: appointmentId },
            include: { test_catalog: true }
        });
    }

    public async getStaffNameById(staffId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.staff.findUnique({
            where: { staff_id: staffId },
            select: { first_name: true, last_name: true }
        });
    }

    public async getActiveAdminEmails(tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.staff.findMany({
            where: {
                deleted_at: null,
                is_disabled: false,
                staff_roles: { some: { role_id: 1 } } // Role ID 1 is Admin
            },
            select: { email: true }
        });
    }

    public async checkoutTx(
        appointmentId: number,
        patientId: number,
        staffId: number,
        additionalTestCatalogIds: number[],
        paymentMethod: CheckoutPaymentMethod,
        consultationFee: number,
        consultationFeeType: "OLD" | "NEW",
    ) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId }
            });
            if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found");
            if (![13, 14].includes(appointment.appointment_status_id)) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "Appointment is not ready for checkout.");
            }

            if (additionalTestCatalogIds.length > 0) {
                const activeTests = await tx.testCatalog.findMany({
                    where: { test_catalog_id: { in: additionalTestCatalogIds }, is_active: true, deleted_at: null }
                });
                if (activeTests.length !== additionalTestCatalogIds.length) {
                    throw new AppError(400, ErrorCode.BAD_REQUEST, "One or more selected tests are invalid or inactive.");
                }

                await Promise.all(
                    additionalTestCatalogIds.map((testCatalogId) =>
                        tx.testOrder.create({
                            data: {
                                patient_id: patientId,
                                appointment_id: appointmentId,
                                test_catalog_id: testCatalogId,
                                ordered_by_staff_id: staffId,
                            }
                        })
                    )
                );
            }

            const allTestOrders = await tx.testOrder.findMany({
                where: { appointment_id: appointmentId },
                include: { test_catalog: true }
            });

            const testsTotal = allTestOrders.reduce((sum, order) => sum + Number(order.test_catalog.price), 0);
            const totalAmount = consultationFee + testsTotal;

            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todaysPaymentCount = await tx.payment.count({
                where: { paid_at: { gte: today, lt: tomorrow } }
            });

            const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
            const receiptNo = `REC-${datePart}-${String(todaysPaymentCount + 1).padStart(4, "0")}`;

            const payment = await tx.payment.create({
                data: {
                    patient_id: patientId,
                    appointment_id: appointmentId,
                    receipt_no: receiptNo,
                    consultation_fee_type: consultationFeeType,
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    collected_by_staff_id: staffId,
                }
            });

            await tx.paymentLineItem.create({
                data: {
                    payment_id: payment.payment_id,
                    item_type: "CONSULTATION",
                    description: `Consultation Fee (${consultationFeeType === "OLD" ? "Returning" : "New"} Patient)`,
                    amount: consultationFee,
                }
            });

            await Promise.all(
                allTestOrders.map((order) =>
                    tx.paymentLineItem.create({
                        data: {
                            payment_id: payment.payment_id,
                            item_type: "TEST",
                            description: order.test_catalog.test_name,
                            amount: order.test_catalog.price,
                            test_catalog_id: order.test_catalog_id,
                            test_order_id: order.test_order_id,
                        }
                    })
                )
            );

            const updatedAppointment = await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: { appointment_status_id: 6 } // COMPLETED
            });

            await tx.appointmentWorkflowHistory.create({
                data: {
                    appointment_id: appointmentId,
                    appointment_workflow_status_id: 6,
                    changed_by_staff_id: staffId,
                    remarks: "Checked out.",
                }
            });

            const lineItems = await tx.paymentLineItem.findMany({
                where: { payment_id: payment.payment_id }
            });

            return { payment, line_items: lineItems, appointment: updatedAppointment };
        });
    }

    // --- Receipt Recovery (Phase 6) ---

    public async getReceiptByAppointmentId(appointmentId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.payment.findUnique({
            where: { appointment_id: appointmentId },
            include: {
                line_items: true,
                patient: true,
                appointment: { include: { doctor: true } },
            }
        });
    }
}
