import { AppointmentDto, DoctorDto, DashboardResponseDto, DoctorDashboardResponseDto } from "./receptionist.dtos";
import { isPromotedWalkIn, sortAppointmentsByQueuePriority } from "./receptionist.queue.util";

export class ReceptionistMapper {
    private static formatTime12Hour(timeData: string | Date | null): string {
        if (!timeData) return '';
        let timeString: string;
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
        const rawStatus = appt.appointment_status?.value_name || 'BOOKED';
        const statusName = rawStatus.toUpperCase().replace(/ /g, '_');
        const isArrived = statusName !== 'BOOKED';
        
        let uiTimeSlot = 'Walk-in';
        if (appt.doctor_availability?.start_time && appt.doctor_availability?.end_time) {
            uiTimeSlot = `${this.formatTime12Hour(appt.doctor_availability.start_time)} - ${this.formatTime12Hour(appt.doctor_availability.end_time)}`;
        }

        const apptDate = appt.appointment_date ? new Date(appt.appointment_date) : null;
        const now = new Date();
        const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();
        let uiDateStr = "";
        if (apptDate) {
            if (apptDate.toDateString() === todayStr) {
                uiDateStr = "Today";
            } else {
                uiDateStr = apptDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }
        }
        const uiDashboardSlot = uiDateStr ? `${uiDateStr} • ${uiTimeSlot}` : uiTimeSlot;

        return {
            appointment_id: appt.appointment_id,
            appointment_status_id: appt.appointment_status_id,
            doctor_staff_id: appt.doctor_staff_id,
            date: appt.appointment_date ? appt.appointment_date.toISOString() : '',
            status: statusName,
            ui_time_slot: uiTimeSlot,
            ui_dashboard_slot: uiDashboardSlot,
            ui_is_arrived: isArrived,
            ui_doctor_name: appt.doctor ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : null,
            patient: {
                patient_id: appt.patient.patient_id,
                first_name: appt.patient.first_name,
                middle_name: appt.patient.middle_name,
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
                created_at: appt.queue.joined_queue_at,
            } : undefined,
            is_priority: isPromotedWalkIn(appt),
        };
    }

    public static toDoctorDto(doc: any): DoctorDto {
        const orderedAppointments = doc.doctor_appointments
            ? sortAppointmentsByQueuePriority(doc.doctor_appointments)
            : undefined;

        return {
            staff_id: doc.staff_id,
            first_name: doc.first_name,
            last_name: doc.last_name,
            specialization: doc.doctor_profile?.specialization || null,
            in_consultation: orderedAppointments?.filter((a: any) => a.appointment_status_id === 12).length || 0, // IN_CONSULTATION
            waiting: orderedAppointments?.filter((a: any) => [5, 13, 14].includes(a.appointment_status_id)).length || 0, // CHECKED_IN, WAITING_REPORTS, AWAITING_PAYMENT
            completed: orderedAppointments?.filter((a: any) => a.appointment_status_id === 6).length || 0, // COMPLETED
            doctor_appointments: orderedAppointments
                ? orderedAppointments.map((appt: any) => this.toAppointmentDto({ ...appt, doctor: doc, patient: appt.patient }))
                : undefined,
        };
    }

    public static toDashboardResponse(doctors: any[], appointments: any[], stats?: any): DashboardResponseDto {
        return {
            doctors: doctors.map(doc => this.toDoctorDto(doc)),
            upcomingAppointments: appointments.map(appt => this.toAppointmentDto(appt)),
            stats
        };
    }

    private static getStatusStr(statusId: number): string {
        if (statusId === 4) return 'scheduled';
        if (statusId === 5) return 'waiting'; 
        if (statusId === 12) return 'in-consultation';
        if (statusId === 13) return 'waiting-reports';
        if (statusId === 14) return 'awaiting-payment';
        if (statusId === 6) return 'completed';
        if (statusId === 15) return 'walked-out';
        return 'unknown';
    }

    public static toPatientQueueDtoFromAppt(appt: AppointmentDto): any {
        return {
            id: appt.appointment_id.toString(),
            patientDbId: appt.patient.patient_id,
            name: `${appt.patient.first_name} ${appt.patient.middle_name ? appt.patient.middle_name + ' ' : ''}${appt.patient.last_name}`,
            time: appt.queue_info ? new Date(appt.queue_info.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            type: appt.queue_info?.queue_type === 'WALK_IN' ? 'walk-in' : 'advance',
            status: this.getStatusStr(appt.appointment_status_id || 0),
            token: appt.queue_info?.queue_number?.toString() || undefined,
            phone: appt.patient.mobile_number,
            profileStatus: appt.patient.is_account_complete ? 'complete' : 'incomplete',
            visitReason: appt.visit_reason || 'Checkup',
            scheduledTime: appt.ui_time_slot !== 'Walk-in' ? appt.ui_time_slot : undefined,
            isPriority: appt.is_priority || false,
        };
    }

    public static toDoctorDashboardResponse(doctor: any, appointments: any[]): DoctorDashboardResponseDto {
        const orderedAppointments = doctor?.doctor_appointments
            ? sortAppointmentsByQueuePriority(doctor.doctor_appointments)
            : [];

        const advanceQueue = orderedAppointments.map((appt: any) => this.toAppointmentDto({ ...appt, doctor, patient: appt.patient }));
            
        const localAppointmentsData = appointments.map(appt => this.toAppointmentDto(appt));

        const activeAppointments = advanceQueue.map((appt: AppointmentDto) => this.toPatientQueueDtoFromAppt(appt));
        
        const currentlyConsulting = activeAppointments.find((p: any) => p.status === 'in-consultation') || 
            localAppointmentsData.map(appt => this.toPatientQueueDtoFromAppt(appt)).find((p: any) => p.status === 'in-consultation') || null;

        const waitingPatients = activeAppointments.filter(
            (p: any) => p.status !== 'completed' && p.status !== 'walked-out' && p.status !== 'in-consultation' && p.status !== 'scheduled'
        );

        const advanceBookingQueue = waitingPatients.filter((p: any) => p.type === 'advance');
        const walkInBookingQueue = waitingPatients.filter((p: any) => p.type === 'walk-in');

        const pendingAppointments = localAppointmentsData
            .filter((appt: AppointmentDto) => appt.doctor_staff_id === doctor.staff_id && this.getStatusStr(appt.appointment_status_id || 0) !== 'in-consultation' && !appt.ui_is_arrived)
            .map((appt: AppointmentDto) => this.toPatientQueueDtoFromAppt(appt));
            
        return {
            doctor: this.toDoctorDto(doctor),
            currentlyConsulting,
            advanceBookingQueue,
            walkInBookingQueue,
            pendingAppointments
        };
    }
}
