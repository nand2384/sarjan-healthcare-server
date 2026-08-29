import { AppError, ErrorCode } from "@errors";
import { CatalogItemType } from "@generated/prisma/client";
import { ConsultationRepository } from "./consultation.repository";
import { CreateConsultationDto } from "./consultation.schema";
import { ReferralRepository } from "@modules/referral/referral.repository";
import { ReferralService } from "@modules/referral/referral.service";
import { CatalogService } from "@modules/catalog/catalog.service";
import { ReceptionistService } from "@modules/receptionist/receptionist.service";

export class ConsultationService {
    constructor(
        private readonly consultationRepository: ConsultationRepository,
        private readonly referralRepository: ReferralRepository,
        private readonly referralService: ReferralService,
        private readonly catalogService: CatalogService,
        private readonly receptionistService: ReceptionistService,
    ) {}

    public async createConsultation(
        dto: CreateConsultationDto,
        callerStaffId: number,
        restrictToDoctorStaffId?: number,
    ) {
        const appointment = await this.consultationRepository.findAppointmentById(dto.appointment_id);
        if (!appointment) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found.");
        }
        if (restrictToDoctorStaffId !== undefined && appointment.doctor_staff_id !== restrictToDoctorStaffId) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "You can only submit consultations for your own patients' appointments.");
        }

        const doctorStaffId = appointment.doctor_staff_id;

        const consultation = await this.consultationRepository.create(
            dto.appointment_id,
            appointment.patient_id,
            doctorStaffId,
            dto,
        );

        // Reuses the existing appointment status-transition logic (workflow
        // history row, queue deactivation, live QUEUE_UPDATED broadcast) —
        // not reimplemented here.
        await this.receptionistService.updateAppointmentStatus(
            dto.appointment_id,
            "completed",
            callerStaffId,
            restrictToDoctorStaffId,
        );

        if (dto.referred_to_staff_id) {
            // The treating doctor referring their own just-consulted patient
            // always has access — bypass the redundant access re-check.
            await this.referralService.createReferral(
                { patient_id: appointment.patient_id, referred_to_staff_id: dto.referred_to_staff_id, note: dto.referral_note },
                doctorStaffId,
                true,
                consultation.consultation_id,
            );
        }

        const catalogValues: Partial<Record<CatalogItemType, string[]>> = {
            SYMPTOM: dto.symptoms_list.map((s) => s.name),
            DIAGNOSIS: dto.diagnosis_list,
            MEDICINE: dto.prescribed_meds.map((m) => m.name),
            INVESTIGATION: dto.selected_tests,
        };
        await this.catalogService.recordUsageFromConsultation(doctorStaffId, catalogValues);

        return consultation;
    }

    public async getPatientHistory(patientId: number, staffId: number, isPrivileged: boolean) {
        if (!isPrivileged) {
            const hasAccess = await this.referralService.hasPatientAccess(staffId, patientId);
            if (!hasAccess) {
                throw new AppError(403, ErrorCode.FORBIDDEN, "You do not have access to this patient's records.");
            }
        }
        return this.consultationRepository.findByPatientId(patientId);
    }

    public async getPatientsMine(doctorStaffId: number) {
        const { direct, referred } = await this.referralRepository.findAccessiblePatientIds(doctorStaffId);
        const directSet = new Set(direct);
        const allIds = Array.from(new Set([...direct, ...referred]));

        const [patients, consultations] = await Promise.all([
            this.consultationRepository.findPatientsByIds(allIds),
            this.consultationRepository.findByPatientIds(allIds),
        ]);

        const byPatient = new Map<number, typeof consultations>();
        for (const c of consultations) {
            const list = byPatient.get(c.patient_id) ?? [];
            list.push(c);
            byPatient.set(c.patient_id, list);
        }

        return patients.map((patient) => {
            const history = byPatient.get(patient.patient_id) ?? [];
            const allergies = new Set<string>();
            const diagnoses = new Set<string>();
            for (const c of history) {
                c.reported_allergies.forEach((a) => allergies.add(a));
                c.diagnosis_list.forEach((d) => diagnoses.add(d));
            }
            return {
                patient,
                relationship: directSet.has(patient.patient_id) ? ("direct" as const) : ("referred" as const),
                lastVisit: history[0]?.created_at ?? null,
                visitCount: history.length,
                allergies: Array.from(allergies),
                diagnoses: Array.from(diagnoses),
            };
        });
    }
}
