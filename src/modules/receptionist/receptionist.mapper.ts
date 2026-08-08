import { AppointmentDto, DoctorDto, DashboardResponseDto, DoctorDashboardResponseDto, AppointmentHistoryItemDto } from "./receptionist.dtos";
import { isPromotedWalkIn, sortAppointmentsByQueuePriority } from "./receptionist.queue.util";
import { getAppointmentStartInstantUTC, getAppointmentEndInstantUTC } from "utils/appointment-time.util";

export type PendingReviewMap = Map<number, { appointment_id: number; review_token: string }>;

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

    // Format a GMT/UTC date to IST (Indian Standard Time, UTC+5:30) in 12-hour format
    private static formatTimeGMTtoIST(gmtDate: string | Date | null): string {
        if (!gmtDate) return '';
        const date = typeof gmtDate === 'string' ? new Date(gmtDate) : gmtDate;
        // IST is UTC+5:30, so add 5.5 hours (330 minutes)
        const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
        const timeString = istDate.toISOString().substring(11, 16);
        const [hoursStr, minutes] = timeString.split(':');
        const hours = parseInt(hoursStr, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
    }

    public static toAppointmentDto(appt: any, walkInPriorityThreshold?: number, checkInWindowHours?: number, pendingReviewMap?: PendingReviewMap): AppointmentDto {
        const rawStatus = appt.appointment_status?.value_name || 'BOOKED';
        const statusName = rawStatus.toUpperCase().replace(/ /g, '_');
        const isArrived = statusName !== 'BOOKED';

        let uiTimeSlot = 'Walk-in';
        if (appt.doctor_availability?.start_time && appt.doctor_availability?.end_time) {
            uiTimeSlot = `${this.formatTime12Hour(appt.doctor_availability.start_time)} - ${this.formatTime12Hour(appt.doctor_availability.end_time)}`;
        }

        // Check-in window is only meaningful for scheduled (non-walk-in) BOOKED
        // appointments — walk-ins are created already CHECKED_IN, so they never
        // reach this branch with statusName === 'BOOKED'.
        let checkInOpensAt: Date | undefined;
        let checkInClosesAt: Date | undefined;
        let canCheckIn = false;
        if (statusName === 'BOOKED' && appt.doctor_availability?.start_time && appt.doctor_availability?.end_time && appt.appointment_date) {
            const startInstant = getAppointmentStartInstantUTC(appt.appointment_date, appt.doctor_availability.start_time);
            const endInstant = getAppointmentEndInstantUTC(appt.appointment_date, appt.doctor_availability.end_time);
            const hoursBefore = checkInWindowHours ?? 1;
            checkInOpensAt = new Date(startInstant.getTime() - hoursBefore * 60 * 60 * 1000);
            checkInClosesAt = endInstant;
            const now = Date.now();
            canCheckIn = now >= checkInOpensAt.getTime() && now <= checkInClosesAt.getTime();
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

        // The patient's own most-recent completed-but-unreviewed appointment —
        // never the current one being mapped here, since that can't have a
        // review yet either way. Powers the receptionist "feedback pending" badge.
        const pendingReview = pendingReviewMap?.get(appt.patient?.patient_id) ?? null;

        return {
            appointment_id: appt.appointment_id,
            appointment_status_id: appt.appointment_status_id,
            doctor_staff_id: appt.doctor_staff_id,
            date: appt.appointment_date ? appt.appointment_date.toISOString() : '',
            status: statusName,
            ui_time_slot: uiTimeSlot,
            ui_dashboard_slot: uiDashboardSlot,
            ui_is_arrived: isArrived,
            ui_can_check_in: canCheckIn,
            check_in_opens_at: checkInOpensAt?.toISOString(),
            check_in_closes_at: checkInClosesAt?.toISOString(),
            reschedule_count: appt.reschedule_count ?? 0,
            pending_review: pendingReview,
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
            is_priority: isPromotedWalkIn(appt, walkInPriorityThreshold),
            status_started_at: appt.appointment_workflow_history?.[0]?.created_at
                ? new Date(appt.appointment_workflow_history[0].created_at).toISOString()
                : undefined,
        };
    }

    public static toDoctorDto(doc: any, walkInPriorityThreshold?: number, checkInWindowHours?: number, pendingReviewMap?: PendingReviewMap): DoctorDto {
        const orderedAppointments = doc.doctor_appointments
            ? sortAppointmentsByQueuePriority(doc.doctor_appointments, walkInPriorityThreshold)
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
                ? orderedAppointments.map((appt: any) => this.toAppointmentDto({ ...appt, doctor: doc, patient: appt.patient }, walkInPriorityThreshold, checkInWindowHours, pendingReviewMap))
                : undefined,
        };
    }

    public static toDashboardResponse(doctors: any[], appointments: any[], stats?: any, walkInPriorityThreshold?: number, checkInWindowHours?: number, pendingReviewMap?: PendingReviewMap): DashboardResponseDto {
        return {
            doctors: doctors.map(doc => this.toDoctorDto(doc, walkInPriorityThreshold, checkInWindowHours, pendingReviewMap)),
            upcomingAppointments: appointments.map(appt => this.toAppointmentDto(appt, walkInPriorityThreshold, checkInWindowHours, pendingReviewMap)),
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
            time: appt.queue_info ? this.formatTimeGMTtoIST(appt.queue_info.created_at) : 'N/A',
            type: appt.queue_info?.queue_type === 'WALK_IN' ? 'walk-in' : 'advance',
            status: this.getStatusStr(appt.appointment_status_id || 0),
            token: appt.queue_info?.queue_number?.toString() || undefined,
            phone: appt.patient.mobile_number,
            profileStatus: appt.patient.is_account_complete ? 'complete' : 'incomplete',
            visitReason: appt.visit_reason || 'Checkup',
            scheduledTime: appt.ui_time_slot !== 'Walk-in' ? appt.ui_time_slot : undefined,
            isPriority: appt.is_priority || false,
            joined_at: appt.queue_info?.created_at ? new Date(appt.queue_info.created_at).toISOString() : undefined,
            status_started_at: appt.status_started_at,
            pendingReview: appt.pending_review
                ? { appointmentId: appt.pending_review.appointment_id, reviewToken: appt.pending_review.review_token }
                : null,
        };
    }

    public static toDoctorDashboardResponse(doctor: any, appointments: any[], walkInPriorityThreshold?: number, checkInWindowHours?: number, pendingReviewMap?: PendingReviewMap): DoctorDashboardResponseDto {
        const orderedAppointments = doctor?.doctor_appointments
            ? sortAppointmentsByQueuePriority(doctor.doctor_appointments, walkInPriorityThreshold)
            : [];

        const advanceQueue = orderedAppointments.map((appt: any) => this.toAppointmentDto({ ...appt, doctor, patient: appt.patient }, walkInPriorityThreshold, checkInWindowHours, pendingReviewMap));

        const localAppointmentsData = appointments.map(appt => this.toAppointmentDto(appt, walkInPriorityThreshold, checkInWindowHours, pendingReviewMap));

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
            doctor: this.toDoctorDto(doctor, walkInPriorityThreshold, checkInWindowHours, pendingReviewMap),
            currentlyConsulting,
            advanceBookingQueue,
            walkInBookingQueue,
            pendingAppointments
        };
    }

    private static readonly HISTORY_STATUS_MAP: Record<number, 'completed' | 'walked-out' | 'cancelled' | 'no-show'> = {
        6: 'completed',
        15: 'walked-out',
        7: 'cancelled',
        16: 'no-show',
    };

    public static toAppointmentHistoryItemDto(appt: any): AppointmentHistoryItemDto {
        return {
            appointment_id: appt.appointment_id,
            date: appt.appointment_date.toISOString(),
            status: this.HISTORY_STATUS_MAP[appt.appointment_status_id] ?? 'cancelled',
            patient_name: `${appt.patient.first_name}${appt.patient.middle_name ? ' ' + appt.patient.middle_name : ''} ${appt.patient.last_name}`,
            mobile_number: appt.patient.mobile_number,
            doctor_name: appt.doctor ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : 'N/A',
            queue_type: appt.queue?.queue_type === 'WALK_IN' ? 'walk-in' : appt.queue?.queue_type === 'BOOKED' ? 'booked' : null,
            payment_status: appt.payment ? 'paid' : 'none',
            total_amount: appt.payment?.total_amount?.toString(),
            payment_method: appt.payment?.payment_method,
            receipt_no: appt.payment?.receipt_no,
            patient_type: appt.payment?.consultation_fee_type,
            tests_ordered_count: appt.test_orders?.length ?? 0,
        };
    }
}
