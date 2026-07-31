import { DoctorAvailability, DoctorLeave } from "@generated/prisma/client";

export interface DoctorAvailabilityDto {
    doctor_availability_id: number;
    doctor_staff_id: number;
    day_of_week: string;
    slot_name: string;
    start_time: Date;
    end_time: Date;
    maximum_appointments: number;
    start_time_formatted: string;
    end_time_formatted: string;
    start_time_12h: string;
    end_time_12h: string;
}

export interface DoctorLeaveResponseDto {
    doctor_leave_id: number;
    doctor_staff_id: number;
    start_date: Date;
    end_date: Date;
    reason: string;
    doctor_availability_id: number | null;
    start_time_formatted?: string | null;
    end_time_formatted?: string | null;
    start_time_12h?: string | null;
    end_time_12h?: string | null;
}

export class DoctorMapper {
    public static formatTime12Hour(dateObj: Date): string {
        if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
        const h = dateObj.getUTCHours();
        const m = dateObj.getUTCMinutes();
        const hour12 = h % 12 || 12;
        const ampm = h >= 12 ? "PM" : "AM";
        return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
    }

    public static formatTime24Hour(dateObj: Date): string {
        if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
        const h = dateObj.getUTCHours();
        const m = dateObj.getUTCMinutes();
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }

    public static toAvailabilityDto(slot: DoctorAvailability): DoctorAvailabilityDto {
        const dayOfWeek = slot.day_of_week
            ? slot.day_of_week.charAt(0).toUpperCase() + slot.day_of_week.slice(1).toLowerCase()
            : "";
        return {
            doctor_availability_id: slot.doctor_availability_id,
            doctor_staff_id: slot.doctor_staff_id,
            day_of_week: dayOfWeek,
            slot_name: slot.slot_name,
            start_time: slot.start_time,
            end_time: slot.end_time,
            maximum_appointments: slot.maximum_appointments,
            start_time_formatted: DoctorMapper.formatTime24Hour(slot.start_time),
            end_time_formatted: DoctorMapper.formatTime24Hour(slot.end_time),
            start_time_12h: DoctorMapper.formatTime12Hour(slot.start_time),
            end_time_12h: DoctorMapper.formatTime12Hour(slot.end_time),
        };
    }

    public static toAvailabilityListDto(slots: DoctorAvailability[]): DoctorAvailabilityDto[] {
        return slots.map(slot => DoctorMapper.toAvailabilityDto(slot));
    }

    public static toLeaveDto(leave: DoctorLeave, linkedSlot?: DoctorAvailability | null): DoctorLeaveResponseDto {
        return {
            doctor_leave_id: leave.doctor_leave_id,
            doctor_staff_id: leave.doctor_staff_id,
            start_date: leave.start_date,
            end_date: leave.end_date,
            reason: leave.reason,
            doctor_availability_id: leave.doctor_availability_id,
            start_time_formatted: linkedSlot ? DoctorMapper.formatTime24Hour(linkedSlot.start_time) : null,
            end_time_formatted: linkedSlot ? DoctorMapper.formatTime24Hour(linkedSlot.end_time) : null,
            start_time_12h: linkedSlot ? DoctorMapper.formatTime12Hour(linkedSlot.start_time) : null,
            end_time_12h: linkedSlot ? DoctorMapper.formatTime12Hour(linkedSlot.end_time) : null,
        };
    }

    public static toLeaveListDto(leaves: DoctorLeave[], allSlots?: DoctorAvailability[]): DoctorLeaveResponseDto[] {
        return leaves.map(leave => {
            const linkedSlot = allSlots?.find(s => s.doctor_availability_id === leave.doctor_availability_id);
            return DoctorMapper.toLeaveDto(leave, linkedSlot);
        });
    }
}
