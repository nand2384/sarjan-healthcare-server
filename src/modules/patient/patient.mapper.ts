import { Patient, Appointment, Queue } from "@generated/prisma/client";
import { RegisterAndBookResponseDto } from "./patient.dtos";

export class PatientMapper {
    public static toRegisterAndBookResponse(
        patient: Patient,
        appointment: Appointment,
        queue: Queue | null
    ): RegisterAndBookResponseDto {
        return {
            patient_id: patient.patient_id,
            uhid: patient.uhid,
            first_name: patient.first_name,
            last_name: patient.last_name,
            appointment_id: appointment.appointment_id,
            appointment_status_id: appointment.appointment_status_id,
            queue_number: queue ? queue.queue_number : null,
        };
    }

    public static toPatientSearchResponse(
        patients: any[],
        total: number,
        page: number,
        limit: number
    ) {
        return {
            items: patients.map(p => {
                let age = 0;
                if (p.date_of_birth) {
                    const dob = new Date(p.date_of_birth);
                    const diff = Date.now() - dob.getTime();
                    age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
                }

                return {
                    patient_id: p.patient_id,
                    uhid: p.uhid,
                    first_name: p.first_name,
                    last_name: p.last_name,
                    mobile_number: p.mobile_number,
                    gender: p.gender,
                    age,
                    is_account_complete: p.is_account_complete
                };
            }),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
