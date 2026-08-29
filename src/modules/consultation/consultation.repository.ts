import { Prisma, PrismaClient } from "@generated/prisma/client";
import { CreateConsultationDto } from "./consultation.schema";

export class ConsultationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async findAppointmentById(appointmentId: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;
        return db.appointment.findUnique({ where: { appointment_id: appointmentId } });
    }

    public async create(
        appointmentId: number,
        patientId: number,
        doctorStaffId: number,
        dto: CreateConsultationDto,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;
        return db.consultation.create({
            data: {
                appointment_id: appointmentId,
                patient_id: patientId,
                doctor_staff_id: doctorStaffId,
                vitals: dto.vitals ?? Prisma.JsonNull,
                symptoms_list: dto.symptoms_list,
                symptoms_notes: dto.symptoms_notes,
                diet: dto.diet,
                sleep: dto.sleep,
                lifestyle: dto.lifestyle,
                reported_allergies: dto.reported_allergies,
                history_list: dto.history_list,
                ongoing_medications: dto.ongoing_medications,
                cvs_heart_sounds: dto.cvs_heart_sounds,
                cvs_murmurs: dto.cvs_murmurs,
                rs_air_entry: dto.rs_air_entry,
                rs_added_sounds: dto.rs_added_sounds,
                diagnosis_list: dto.diagnosis_list,
                diagnosis_notes: dto.diagnosis_notes,
                selected_tests: dto.selected_tests,
                prescribed_meds: dto.prescribed_meds,
                prescription_advice: dto.prescription_advice,
                follow_up_days: dto.follow_up_days,
                referred_to_staff_id: dto.referred_to_staff_id,
            },
        });
    }

    public async findByPatientId(patientId: number) {
        return this.prisma.consultation.findMany({
            where: { patient_id: patientId },
            orderBy: { created_at: "desc" },
            include: {
                doctor: { select: { staff_id: true, first_name: true, last_name: true } },
                referred_to_staff: { select: { staff_id: true, first_name: true, last_name: true } },
            },
        });
    }

    public async findByPatientIds(patientIds: number[]) {
        if (patientIds.length === 0) return [];
        return this.prisma.consultation.findMany({
            where: { patient_id: { in: patientIds } },
            orderBy: { created_at: "desc" },
        });
    }

    public async findPatientsByIds(patientIds: number[]) {
        if (patientIds.length === 0) return [];
        return this.prisma.patient.findMany({
            where: { patient_id: { in: patientIds } },
            select: {
                patient_id: true,
                uhid: true,
                first_name: true,
                last_name: true,
                mobile_number: true,
                age: true,
                gender: { select: { value_name: true } },
            },
        });
    }
}
