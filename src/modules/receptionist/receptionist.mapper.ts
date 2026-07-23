import { AppointmentDto, DoctorDto, DashboardResponseDto, DoctorDashboardResponseDto } from "./receptionist.dtos";

export class ReceptionistMapper {
    private static formatTime12Hour(timeData: string | Date | null): string {
        if (!timeData) return '';
        let timeString = '';
        if (timeData instanceof Date) {
            timeString = timeData.toISOString().substring(11, 16);
        } else if (typeof timeData === 'string') {
            timeString = timeData;
        } else {
            return '';
        }
        const [hoursStr, minutes] = timeString.split(':');
        const hours = parseInt(hoursStr, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
    }

    public static toAppointmentDto(appt: any): AppointmentDto {
        const statusName = appt.appointment_status?.value_name || 'BOOKED';
        const isArrived = statusName !== 'BOOKED';
        
        let uiTimeSlot = 'Walk-in';
        if (appt.doctor_availability?.start_time && appt.doctor_availability?.end_time) {
            uiTimeSlot = `${this.formatTime12Hour(appt.doctor_availability.start_time)} - ${this.formatTime12Hour(appt.doctor_availability.end_time)}`;
        }

        return {
            appointment_id: appt.appointment_id,
            doctor_staff_id: appt.doctor_staff_id,
            date: appt.appointment_date ? appt.appointment_date.toISOString().split('T')[0] : '',
            status: statusName,
            ui_time_slot: uiTimeSlot,
            ui_is_arrived: isArrived,
            ui_doctor_name: appt.doctor ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : null,
            patient: {
                patient_id: appt.patient.patient_id,
                first_name: appt.patient.first_name,
                last_name: appt.patient.last_name,
                mobile_number: appt.patient.mobile_number,
                is_account_complete: appt.patient.is_account_complete,
            },
            doctor: appt.doctor ? {
                first_name: appt.doctor.first_name,
                last_name: appt.doctor.last_name,
            } : undefined,
            visit_reason: appt.visit_reason?.value_name || 'Checkup',
            queue_info: appt.queue ? {
                queue_number: appt.queue.queue_number,
                queue_type: appt.queue.queue_type,
                created_at: appt.queue.created_at,
            } : undefined
        };
    }

    public static toDoctorDto(doc: any): DoctorDto {
        return {
            staff_id: doc.staff_id,
            first_name: doc.first_name,
            last_name: doc.last_name,
            specialization: doc.doctor_profile?.specialization || null,
            in_consultation: doc.doctor_appointments?.filter((a: any) => a.appointment_status_id === 12).length || 0, // IN_CONSULTATION
            waiting: doc.doctor_appointments?.filter((a: any) => [5, 13, 14].includes(a.appointment_status_id)).length || 0, // CHECKED_IN, WAITING_REPORTS, AWAITING_PAYMENT
            completed: doc.doctor_appointments?.filter((a: any) => a.appointment_status_id === 6).length || 0, // COMPLETED
        };
    }

    public static toDashboardResponse(doctors: any[], appointments: any[], stats?: any): DashboardResponseDto {
        return {
            doctors: doctors.map(doc => this.toDoctorDto(doc)),
            upcomingAppointments: appointments.map(appt => this.toAppointmentDto(appt)),
            stats
        };
    }

    public static toDoctorDashboardResponse(doctor: any, appointments: any[]): DoctorDashboardResponseDto {
        return {
            doctor: this.toDoctorDto(doctor),
            upcomingAppointments: appointments.map(appt => this.toAppointmentDto(appt))
        };
    }
}
