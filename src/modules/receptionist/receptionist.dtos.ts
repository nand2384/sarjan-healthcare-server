import { z } from "zod";
import { updateAppointmentStatusSchema } from "./receptionist.schema";

export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusSchema>;

export interface AppointmentDto {
    appointment_id: number;
    doctor_staff_id?: number;
    date: string;
    status: string;
    ui_time_slot: string;
    ui_is_arrived: boolean;
    ui_doctor_name: string | null;
    patient: {
        patient_id: number;
        first_name: string;
        last_name: string;
        mobile_number: string;
        is_account_complete: boolean;
    };
    doctor?: {
        first_name: string;
        last_name: string;
    };
    visit_reason: string;
    queue_info?: {
        queue_number: number;
        queue_type: string;
        created_at: Date;
    };
}

export interface DoctorDto {
    staff_id: number;
    first_name: string;
    last_name: string;
    specialization: string | null;
    in_consultation: number;
    waiting: number;
    completed: number;
}

export interface DashboardResponseDto {
    doctors: DoctorDto[];
    upcomingAppointments: AppointmentDto[];
    stats?: {
        totalAppointments: number;
        remainingAppointments: number;
    };
}

export interface DoctorDashboardResponseDto {
    doctor: DoctorDto;
    upcomingAppointments: AppointmentDto[];
}
