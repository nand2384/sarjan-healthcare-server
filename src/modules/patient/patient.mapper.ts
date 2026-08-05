import { Patient, Appointment, Queue } from "@generated/prisma/client";
import { RegisterAndBookResponseDto, SearchDuplicatesResponseDto, DuplicatePatientItemDto } from "./patient.dtos";

export interface PatientDuplicateRecord {
    patient_id: number;
    uhid: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    mobile_number?: string | null;
    age?: number | null;
    gender?: { value_name: string } | null;
}

export class PatientMapper {
    private static formatTime12Hour(timeData: unknown): string {
        if (!timeData) return '';
        let timeString: string;
        if (timeData instanceof Date) {
            timeString = timeData.toISOString().substring(11, 16);
        } else if (typeof timeData === 'string') {
            if (timeData.includes('T')) {
                const date = new Date(timeData);
                if (!isNaN(date.getTime())) {
                    timeString = date.toISOString().substring(11, 16);
                } else {
                    timeString = timeData;
                }
            } else {
                timeString = timeData;
            }
        } else {
            return '';
        }
        const [hoursStr, minutes] = timeString.split(':');
        const hours = parseInt(hoursStr, 10);
        if (isNaN(hours)) return '';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes || '00'} ${ampm}`;
    }

    public static toRegisterAndBookResponse(
        patient: Patient,
        appointment: Appointment,
        queue: Queue | null
    ): RegisterAndBookResponseDto {
        return {
            patient_id: patient.patient_id,
            uhid: patient.uhid,
            first_name: patient.first_name,
            middle_name: patient.middle_name || "",
            last_name: patient.last_name,
            appointment_id: appointment.appointment_id,
            appointment_status_id: appointment.appointment_status_id,
            queue_number: queue ? queue.queue_number : null,
            whatsapp_verified: !!patient.whatsapp_verified_at,
        };
    }

    public static toPatientSearchResponse(
        patients: Record<string, unknown>[],
        total: number,
        page: number,
        limit: number
    ) {
        return {
            items: patients.map((p: any) => {
                let age = p.age || 0;
                if (!age && p.date_of_birth) {
                    const dob = new Date(p.date_of_birth);
                    const diff = Date.now() - dob.getTime();
                    age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
                }

                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                let ui_next_appointment: Record<string, string> | null = null;
                let ui_last_visit: Record<string, string> | null = null;

                if (p.appointments && Array.isArray(p.appointments) && p.appointments.length > 0) {
                    const futureAppts = p.appointments.filter((a: any) => {
                        const d = new Date(a.appointment_date);
                        const status = a.appointment_status?.value_name?.toUpperCase() || "";
                        return d.getTime() >= today.getTime() && !['CANCELLED', 'COMPLETED', 'DISCHARGED'].includes(status);
                    }).sort((a: any, b: any) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

                    if (futureAppts.length > 0) {
                        const nextApp = futureAppts[0];
                        const appDate = new Date(nextApp.appointment_date);
                        const dateStr = appDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        const doctorName = nextApp.doctor ? `Dr. ${nextApp.doctor.first_name} ${nextApp.doctor.last_name}` : "Assigned Doctor";
                        const statusName = nextApp.appointment_status?.value_name || "BOOKED";
                        let timeStr = "";
                        if (nextApp.doctor_availability?.start_time && nextApp.doctor_availability?.end_time) {
                            timeStr = `${this.formatTime12Hour(nextApp.doctor_availability.start_time)} - ${this.formatTime12Hour(nextApp.doctor_availability.end_time)}`;
                        }
                        const reason = nextApp.visit_reason?.value_name || "Checkup";

                        ui_next_appointment = {
                            title: `Next Appointment: ${dateStr}${timeStr ? ` (${timeStr})` : ""}`,
                            doctor_text: `With ${doctorName} for ${reason}`,
                            status_badge: statusName,
                            ui_color: statusName === 'BOOKED' ? 'blue' : statusName === 'WAITING' ? 'amber' : 'green'
                        };
                    }

                    const pastAppts = p.appointments.filter((a: any) => {
                        const d = new Date(a.appointment_date);
                        const status = a.appointment_status?.value_name?.toUpperCase() || "";
                        return d.getTime() < today.getTime() || ['COMPLETED', 'DISCHARGED', 'CHECKED_IN', 'IN_CONSULTATION', 'WAITING_REPORTS', 'AWAITING_PAYMENT'].includes(status);
                    }).sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

                    if (pastAppts.length > 0) {
                        const lastVisit = pastAppts[0];
                        const visitDate = new Date(lastVisit.appointment_date);
                        const dateStr = visitDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        const doctorName = lastVisit.doctor ? `Dr. ${lastVisit.doctor.first_name} ${lastVisit.doctor.last_name}` : "Assigned Doctor";
                        const reason = lastVisit.visit_reason?.value_name || "General Visit";
                        const status = lastVisit.appointment_status?.value_name || "Completed";

                        ui_last_visit = {
                            date: dateStr,
                            doctor: doctorName,
                            reason: reason,
                            status: status,
                            summary: `${dateStr} • ${doctorName} (${reason})`
                        };
                    }
                }

                const addressParts = [p.street_address, p.city, p.state, p.pincode].filter(Boolean);
                const ui_location = addressParts.length > 0 ? addressParts.join(', ') : "Not Specified";

                return {
                    patient_id: p.patient_id,
                    uhid: p.uhid,
                    first_name: p.first_name,
                    middle_name: p.middle_name || "",
                    last_name: p.last_name,
                    mobile_number: p.mobile_number,
                    whatsapp_number: p.whatsapp_number || p.mobile_number,
                    whatsapp_verified: !!p.whatsapp_verified_at,
                    referred_by: p.referred_by || null,
                    email: p.email || "Not Specified",
                    gender: p.gender?.value_name || p.gender || "N/A",
                    age,
                    ui_location,
                    ui_registered_date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Recent",
                    is_account_complete: p.is_account_complete,
                    ui_next_appointment,
                    ui_last_visit
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

    public static toSearchDuplicatesResponse(
        records: PatientDuplicateRecord[],
        query: { first_name?: string; middle_name?: string; last_name?: string; mobile_number?: string }
    ): SearchDuplicatesResponseDto {
        const firstNamesSet = new Set<string>();
        const middleNamesSet = new Set<string>();
        const lastNamesSet = new Set<string>();

        const qFirst = query.first_name?.trim().toLowerCase() || "";
        const qMiddle = query.middle_name?.trim().toLowerCase() || "";
        const qLast = query.last_name?.trim().toLowerCase() || "";
        const qMobile = query.mobile_number?.trim() || "";
        const cleanQMobile = qMobile.replace(/\D/g, "");

        const matched_patients: DuplicatePatientItemDto[] = [];

        for (const record of records) {
            const rFirst = record.first_name || "";
            const rMiddle = record.middle_name || "";
            const rLast = record.last_name || "";
            const rMobile = record.mobile_number || "";
            const cleanRMobile = rMobile.replace(/\D/g, "");

            if (qFirst.length > 0 && rFirst.toLowerCase().includes(qFirst)) {
                firstNamesSet.add(rFirst);
            }
            if (qMiddle.length > 0 && rMiddle.length > 0 && rMiddle.toLowerCase().includes(qMiddle)) {
                middleNamesSet.add(rMiddle);
            }
            if (qLast.length > 0 && rLast.toLowerCase().includes(qLast)) {
                lastNamesSet.add(rLast);
            }

            const matchedParams: string[] = [];
            if (qFirst.length > 0 && rFirst.toLowerCase().includes(qFirst)) {
                matchedParams.push(`First Name: '${rFirst}'`);
            }
            if (qMiddle.length > 0 && rMiddle.length > 0 && rMiddle.toLowerCase().includes(qMiddle)) {
                matchedParams.push(`Middle Name: '${rMiddle}'`);
            }
            if (qLast.length > 0 && rLast.toLowerCase().includes(qLast)) {
                matchedParams.push(`Last Name: '${rLast}'`);
            }
            if (cleanQMobile.length >= 4 && cleanRMobile.includes(cleanQMobile)) {
                matchedParams.push(`Mobile: '${rMobile}'`);
            }

            if (matchedParams.length > 0) {
                const badge = matchedParams.length >= 2 ? "Strong Match" : "Partial Match";
                const ageStr = record.age ? `${record.age} Y` : "Age N/A";
                const genderStr = record.gender?.value_name || "Gender N/A";

                matched_patients.push({
                    patient_id: record.patient_id,
                    uhid: record.uhid,
                    first_name: rFirst,
                    middle_name: rMiddle || null,
                    last_name: rLast,
                    mobile_number: record.mobile_number || null,
                    ui_full_name: `${rFirst}${rMiddle ? " " + rMiddle : ""} ${rLast}`,
                    ui_demographics: `${ageStr} / ${genderStr}`,
                    ui_matched_params: matchedParams,
                    ui_match_badge: badge
                });
            }
        }

        matched_patients.sort((a, b) => {
            if (a.ui_match_badge === "Strong Match" && b.ui_match_badge !== "Strong Match") return -1;
            if (a.ui_match_badge !== "Strong Match" && b.ui_match_badge === "Strong Match") return 1;
            return b.ui_matched_params.length - a.ui_matched_params.length;
        });

        return {
            suggestions: {
                first_names: Array.from(firstNamesSet).slice(0, 10),
                middle_names: Array.from(middleNamesSet).slice(0, 10),
                last_names: Array.from(lastNamesSet).slice(0, 10),
            },
            matched_patients: matched_patients.slice(0, 15)
        };
    }
}
