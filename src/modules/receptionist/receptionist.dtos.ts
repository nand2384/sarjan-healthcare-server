import { z } from "zod";
import { updateAppointmentStatusSchema } from "./receptionist.schema";

export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusSchema>;

export interface AppointmentDto {
    appointment_id: number;
    appointment_status_id?: number;
    doctor_staff_id?: number;
    date: string;
    status: string;
    ui_time_slot: string;
    ui_dashboard_slot?: string;
    ui_is_arrived: boolean;
    ui_doctor_name: string | null;
    patient: {
        patient_id: number;
        first_name: string;
        middle_name?: string | null;
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
    is_priority: boolean;
    status_started_at?: string; // ISO timestamp when the current appointment_status began - for live timer
}

export interface DoctorDto {
    staff_id: number;
    first_name: string;
    last_name: string;
    specialization: string | null;
    in_consultation: number;
    waiting: number;
    completed: number;
    doctor_appointments?: AppointmentDto[];
}

export interface DashboardResponseDto {
    doctors: DoctorDto[];
    upcomingAppointments: AppointmentDto[];
    stats?: {
        totalAppointments: number;
        remainingAppointments: number;
    };
}

export interface PatientQueueDto {
    id: string;
    patientDbId: number;
    name: string;
    time: string;
    type: 'advance' | 'walk-in';
    status: string;
    token?: string;
    phone: string;
    profileStatus: 'complete' | 'incomplete';
    visitReason: string;
    scheduledTime?: string;
    isPriority: boolean;
    joined_at?: string; // ISO timestamp (GMT) when patient joined queue - for live timer
    status_started_at?: string; // ISO timestamp (GMT) when the current status began - for live timer
}

export interface DoctorDashboardResponseDto {
    doctor: DoctorDto;
    currentlyConsulting: PatientQueueDto | null;
    advanceBookingQueue: PatientQueueDto[];
    walkInBookingQueue: PatientQueueDto[];
    pendingAppointments: PatientQueueDto[];
}

export interface AppointmentHistoryItemDto {
    appointment_id: number;
    date: string;
    status: 'completed' | 'walked-out' | 'cancelled';
    patient_name: string;
    mobile_number: string;
    doctor_name: string;
    queue_type: 'walk-in' | 'booked' | null;
    payment_status: 'paid' | 'none';
    total_amount?: string;
    payment_method?: string;
    receipt_no?: string;
    patient_type?: 'NEW' | 'OLD';
    tests_ordered_count: number;
}

export interface AppointmentHistoryResponseDto {
    rows: AppointmentHistoryItemDto[];
    total: number;
    page: number;
    limit: number;
}

export interface AppointmentHistorySummaryDto {
    totalVisits: number;
    walkInCount: number;
    bookedCount: number;
    newPatientCount: number;
    returningPatientCount: number;
    totalCollected: number;
}
