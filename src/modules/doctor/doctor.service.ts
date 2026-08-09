import { PrismaClient } from "@generated/prisma/client";
import { DoctorRepository } from "./doctor.repository";
import { CreateDoctorDto } from "./doctor.dto";
import { UpdateDoctorDto, DoctorAvailabilitySlotDto, DoctorLeaveDto } from "./doctor.schema";
import { DoctorMapper } from "./doctor.mapper";
import { AppError, ErrorCode } from "@errors";
import { StaffRepository } from "@modules/staff/staff.repository";
import { StaffRoleRepository } from "@modules/staff-role/staff-role.repository";
import { AuditService } from "@modules/audit/audit.service";
import { MailerService } from "mailer";
import { env } from "@config";
import crypto from "node:crypto";
import { AuditAction, AuditEntityType, DayOfWeek } from "@generated/prisma/client";
import { logger } from "@logger";
import { StorageService } from "@modules/storage/storage.service";
import { formatSlotTime12Hour } from "utils/appointment-time.util";

const PHOTO_TYPES = ["card", "pose"] as const;
export type DoctorPhotoType = (typeof PHOTO_TYPES)[number];

// JS Date#getDay() is 0=Sunday..6=Saturday — maps directly onto the DayOfWeek enum.
const JS_DAY_INDEX_TO_ENUM: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
];

export class DoctorService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly doctorRepository: DoctorRepository,
        private readonly staffRepository: StaffRepository,
        private readonly staffRoleRepository: StaffRoleRepository,
        private readonly auditService: AuditService,
        private readonly mailerService: MailerService,
        private readonly storageService: StorageService,
    ) {}

    public async getAllDoctors() {
        const doctors = await this.doctorRepository.getAllDoctors();
        return doctors.map(doctor => {
            const mappedDoctor = {
                ...doctor,
                roles: doctor.staff_roles.map((sr) => sr.role),
            };
            delete (mappedDoctor as any).staff_roles;
            return mappedDoctor;
        });
    }

    public async getDoctorById(staffId: number) {
        const doctor = await this.doctorRepository.findDoctorById(staffId);
        if (!doctor) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        }
        
        // Map staff_roles to roles to match StaffDetail interface expected by frontend
        const mappedDoctor = {
            ...doctor,
            roles: doctor.staff_roles.map((sr) => sr.role),
            // Derived, admin-facing URLs for the photo management UI — the
            // raw storage keys stay server-side, only used to build the URL.
            doctor_profile: doctor.doctor_profile && {
                ...doctor.doctor_profile,
                card_photo_url: doctor.doctor_profile.card_photo_key ? this.storageService.getPublicUrl(doctor.doctor_profile.card_photo_key) : null,
                pose_photo_url: doctor.doctor_profile.pose_photo_key ? this.storageService.getPublicUrl(doctor.doctor_profile.pose_photo_key) : null,
            },
        };
        delete (mappedDoctor as any).staff_roles;

        return mappedDoctor;
    }

    public async createDoctor(dto: CreateDoctorDto, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const {
            first_name,
            last_name,
            username,
            email,
            mobile_number,
            gender_id,
            age,
            street_address,
            city,
            state,
            pincode,
            specialization,
            qualification,
            registration_number,
            biography,
            experience,
            is_visible_on_website,
            is_accepting_appointments,
            display_order,
        } = dto;

        // Check if username, email or phone already exist
        const existingStaff = await this.staffRepository.findExistingStaff(
            username,
            email,
            mobile_number,
        );

        if (existingStaff) {
            if (existingStaff.username === username) {
                throw new AppError(409, ErrorCode.CONFLICT, "Username already exists.");
            }
            if (existingStaff.email === email) {
                throw new AppError(409, ErrorCode.CONFLICT, "Email already exists.");
            }
            if (existingStaff.mobile_number === mobile_number) {
                throw new AppError(409, ErrorCode.CONFLICT, "Mobile number already exists.");
            }
        }

        // Transaction
        const { staff, activationToken, assignedRole } = await this.prisma.$transaction(
            async (tx) => {
                const activationToken = crypto.randomBytes(32).toString("hex");
                const activationTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                // Create Staff
                const staff = await this.staffRepository.create(
                    {
                        first_name,
                        last_name,
                        username,
                        email,
                        password_hash: null,
                        mobile_number,
                        gender: { connect: { value_id: gender_id } },
                        age,
                        street_address,
                        city,
                        state,
                        pincode,
                        is_account_activated: false,
                        activation_token: activationToken,
                        activation_token_expires_at: activationTokenExpiresAt,
                    },
                    tx,
                );

                // Assign Doctor Role (Role ID 2)
                const assignedRole = await this.staffRoleRepository.assignRole(
                    staff.staff_id,
                    2,
                    tx,
                );

                // Create Doctor Profile
                await this.doctorRepository.createDoctorProfile(
                    staff.staff_id,
                    {
                        specialization,
                        qualification,
                        registration_number,
                        biography,
                        experience,
                        is_visible_on_website,
                        is_accepting_appointments,
                        display_order,
                    },
                    tx
                );

                // Audit Log
                await this.auditService.log(
                    {
                        ...auditContext,
                        entity_type: AuditEntityType.DOCTOR,
                        entity_id: staff.staff_id.toString(),
                        action: AuditAction.CREATE,
                        old_values: {},
                        new_values: {
                            staff_id: staff.staff_id,
                            username: staff.username,
                            first_name: staff.first_name,
                            last_name: staff.last_name,
                            email: staff.email,
                            mobile_number: staff.mobile_number,
                            specialization,
                        },
                    },
                    tx,
                );

                return { staff, activationToken, assignedRole };
            },
        );

        const activationLink = `${env.FRONTEND_URL}/activate-account?token=${activationToken}`;

        // Fire and forget email
        this.mailerService.sendStaffActivationMail({
            to: staff.email,
            firstName: staff.first_name,
            username: staff.username,
            activationLink,
        }).catch((error: unknown) => {
            logger.error(error, "Failed to send doctor activation email.");
        });

        return this.getDoctorById(staff.staff_id);
    }

    public async updateDoctor(staffId: number, dto: UpdateDoctorDto, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        // Find existing doctor
        const existingDoctor = await this.getDoctorById(staffId);

        const {
            specialization,
            qualification,
            registration_number,
            biography,
            experience,
            is_visible_on_website,
            is_accepting_appointments,
            display_order,
            ...staffPrimitiveData
        } = dto;

        const doctorProfileData = {
            specialization,
            qualification,
            registration_number,
            biography,
            experience,
            is_visible_on_website,
            is_accepting_appointments,
            display_order,
        };

        // Remove undefined fields
        Object.keys(doctorProfileData).forEach(key => doctorProfileData[key as keyof typeof doctorProfileData] === undefined && delete doctorProfileData[key as keyof typeof doctorProfileData]);

        await this.prisma.$transaction(async (tx) => {
            // Update staff primitives if any
            if (Object.keys(staffPrimitiveData).length > 0) {
                await this.staffRepository.update(staffId, staffPrimitiveData, tx);
            }

            // Update doctor profile if any
            if (Object.keys(doctorProfileData).length > 0) {
                await this.doctorRepository.updateDoctorProfile(staffId, doctorProfileData, tx);
            }

            // Audit
            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.DOCTOR,
                entity_id: staffId.toString(),
                action: AuditAction.UPDATE,
                old_values: {}, // Simplified for brevity as per existing pattern
                new_values: dto as any,
            }, tx);
        });

        return this.getDoctorById(staffId);
    }

    /** Uploads (and replaces) a doctor's card or pose photo — decoupled from doctor creation, its own admin surface. */
    public async uploadDoctorPhoto(staffId: number, type: DoctorPhotoType, file: { buffer: Buffer; mimetype: string; originalname: string }) {
        const existing = await this.prisma.doctorProfile.findUnique({ where: { staff_id: staffId } });
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        }

        const extension = file.originalname.split(".").pop() || "jpg";
        const key = `doctors/${staffId}/${type}-${Date.now()}.${extension}`;
        await this.storageService.upload(file.buffer, key, file.mimetype);

        const previousKey = type === "card" ? existing.card_photo_key : existing.pose_photo_key;
        const field = type === "card" ? "card_photo_key" : "pose_photo_key";
        await this.doctorRepository.updateDoctorProfile(staffId, { [field]: key });

        // Best-effort cleanup of the old object — a failure here shouldn't
        // fail the upload the admin is actively waiting on.
        if (previousKey) {
            this.storageService.delete(previousKey).catch((error) => logger.warn({ err: error }, "Failed to delete replaced doctor photo"));
        }

        return { key, url: this.storageService.getPublicUrl(key) };
    }

    public async deleteDoctorPhoto(staffId: number, type: DoctorPhotoType) {
        const existing = await this.prisma.doctorProfile.findUnique({ where: { staff_id: staffId } });
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        }

        const key = type === "card" ? existing.card_photo_key : existing.pose_photo_key;
        const field = type === "card" ? "card_photo_key" : "pose_photo_key";

        if (key) {
            await this.storageService.delete(key);
        }
        await this.doctorRepository.updateDoctorProfile(staffId, { [field]: null });
    }

    /** Public-facing list for the landing page's Doctors grid. */
    public async getPublicList() {
        const doctors = await this.doctorRepository.findPublicList();
        return doctors.map((doctor) => ({
            id: doctor.staff_id,
            name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
            specialty: doctor.doctor_profile?.specialization ?? "",
            education: doctor.doctor_profile?.qualification ?? "",
            experience: doctor.doctor_profile?.experience ?? "",
            cardImageUrl: doctor.doctor_profile?.card_photo_key ? this.storageService.getPublicUrl(doctor.doctor_profile.card_photo_key) : null,
        }));
    }

    /** Public-facing full detail for the doctor detail page. */
    public async getPublicDetail(staffId: number) {
        const doctor = await this.doctorRepository.findPublicDetail(staffId);
        if (!doctor) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        }
        return {
            id: doctor.staff_id,
            name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
            specialty: doctor.doctor_profile?.specialization ?? "",
            education: doctor.doctor_profile?.qualification ?? "",
            experience: doctor.doctor_profile?.experience ?? "",
            biography: doctor.doctor_profile?.biography ?? null,
            cardImageUrl: doctor.doctor_profile?.card_photo_key ? this.storageService.getPublicUrl(doctor.doctor_profile.card_photo_key) : null,
            poseImageUrl: doctor.doctor_profile?.pose_photo_key ? this.storageService.getPublicUrl(doctor.doctor_profile.pose_photo_key) : null,
        };
    }

    /** Doctors with a pose photo uploaded — feeds the hero carousel. */
    public async getPublicHeroDoctors() {
        const doctors = await this.doctorRepository.findPublicList();
        return doctors
            .filter((doctor) => !!doctor.doctor_profile?.pose_photo_key)
            .map((doctor) => ({
                id: doctor.staff_id,
                name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                role: doctor.doctor_profile?.qualification ?? "",
                image: this.storageService.getPublicUrl(doctor.doctor_profile!.pose_photo_key!),
            }));
    }

    /**
     * Public full-week availability for one doctor — the doctor detail page's
     * timeline. Never touches Appointment; only WHEN the doctor is in, never
     * how many slots are booked/remaining. A day fully covered by a full-day
     * leave (doctor_availability_id null) is dropped entirely; a slot covered
     * by a partial-day leave (doctor_availability_id set) is dropped
     * individually — same leave-overlap logic as the internal
     * getEffectiveSchedule(), deliberately reimplemented here rather than
     * reused so this public surface can never accidentally start returning
     * booking counts.
     */
    public async getPublicWeekAvailability(staffId: number) {
        const doctor = await this.doctorRepository.findPublicDetail(staffId);
        if (!doctor) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const toDateStr = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        const [weeklySchedule, leaves] = await Promise.all([
            this.doctorRepository.getDoctorAvailability(staffId),
            this.doctorRepository.getDoctorLeavesInRange(staffId, toDateStr(today), toDateStr(weekEnd)),
        ]);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);

            const dayOfWeek = JS_DAY_INDEX_TO_ENUM[d.getDay()];

            const fullDayLeave = leaves.some((l) => {
                const ls = new Date(l.start_date);
                const le = new Date(l.end_date);
                ls.setHours(0, 0, 0, 0);
                le.setHours(0, 0, 0, 0);
                return !l.doctor_availability_id && ls <= d && le >= d;
            });

            let slots: { slotName: string; startTime: string; endTime: string }[] = [];
            if (!fullDayLeave) {
                const partialLeaveIds = new Set(
                    leaves
                        .filter((l) => {
                            const ls = new Date(l.start_date);
                            const le = new Date(l.end_date);
                            ls.setHours(0, 0, 0, 0);
                            le.setHours(0, 0, 0, 0);
                            return l.doctor_availability_id && ls <= d && le >= d;
                        })
                        .map((l) => l.doctor_availability_id),
                );

                slots = weeklySchedule
                    .filter((s) => s.day_of_week === dayOfWeek && !partialLeaveIds.has(s.doctor_availability_id))
                    .map((s) => ({
                        slotName: s.slot_name,
                        startTime: formatSlotTime12Hour(s.start_time),
                        endTime: formatSlotTime12Hour(s.end_time),
                    }));
            }

            days.push({ date: toDateStr(d), dayOfWeek, slots });
        }

        return days;
    }

    /**
     * Public "everyone today" availability, for the landing page timeline —
     * every visible/accepting doctor's slots for today's day-of-week, with
     * doctors on full/partial leave today filtered out the same way as
     * getPublicWeekAvailability(). No booking counts, no Appointment table.
     */
    public async getPublicTodayAvailability() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = JS_DAY_INDEX_TO_ENUM[today.getDay()];

        const [slots, leaves] = await Promise.all([
            this.doctorRepository.findPublicAvailabilityForDay(dayOfWeek),
            this.doctorRepository.findLeavesForDate(today),
        ]);

        const fullDayLeaveStaffIds = new Set(
            leaves.filter((l) => !l.doctor_availability_id).map((l) => l.doctor_staff_id),
        );
        const partialLeaveAvailabilityIds = new Set(
            leaves.filter((l) => l.doctor_availability_id).map((l) => l.doctor_availability_id),
        );

        const byDoctor = new Map<number, { doctorId: number; name: string; slots: { slotName: string; startTime: string; endTime: string }[] }>();

        for (const slot of slots) {
            if (fullDayLeaveStaffIds.has(slot.doctor_staff_id)) continue;
            if (partialLeaveAvailabilityIds.has(slot.doctor_availability_id)) continue;

            if (!byDoctor.has(slot.doctor_staff_id)) {
                byDoctor.set(slot.doctor_staff_id, {
                    doctorId: slot.doctor_staff_id,
                    name: `Dr. ${slot.doctor.first_name} ${slot.doctor.last_name}`,
                    slots: [],
                });
            }

            byDoctor.get(slot.doctor_staff_id)!.slots.push({
                slotName: slot.slot_name,
                startTime: formatSlotTime12Hour(slot.start_time),
                endTime: formatSlotTime12Hour(slot.end_time),
            });
        }

        return Array.from(byDoctor.values());
    }

    public async getBasicDoctors() {
        return this.doctorRepository.getBasicDoctors();
    }

    public async getDoctorAvailability(staffId: number) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        const availability = await this.doctorRepository.getDoctorAvailability(staffId);
        return DoctorMapper.toAvailabilityListDto(availability);
    }

    public async getEffectiveSchedule(staffId: number, startDate: string, endDate: string) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");

        const [weeklySchedule, leaves, appointments] = await Promise.all([
            this.doctorRepository.getDoctorAvailability(staffId),
            this.doctorRepository.getDoctorLeavesInRange(staffId, startDate, endDate),
            this.prisma.appointment.findMany({
                where: {
                    doctor_staff_id: staffId,
                    appointment_date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate + 'T23:59:59.999Z')
                    }
                },
                select: {
                    appointment_date: true,
                    doctor_availability_id: true,
                    appointment_status_id: true
                }
            })
        ]);

        const bookingsMap: Record<string, Record<number | string, number>> = {};
        for (const appt of appointments) {
            if (appt.appointment_status_id === 7) continue; // Cancelled (7)
            const d = new Date(appt.appointment_date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            if (!bookingsMap[dateStr]) bookingsMap[dateStr] = {};
            const availabilityId = appt.doctor_availability_id ?? 'walk_in';
            if (!bookingsMap[dateStr][availabilityId]) bookingsMap[dateStr][availabilityId] = 0;
            
            bookingsMap[dateStr][availabilityId]++;
        }

        const effectiveSchedule: Record<string, any> = {};

        const daysOfWeekMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Ensure accurate looping by zeroing out time components
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        const formatTime12Hour = (dateObj: Date) => {
            const h = dateObj.getUTCHours();
            const m = dateObj.getUTCMinutes();
            const hour12 = h % 12 || 12;
            const ampm = h >= 12 ? 'PM' : 'AM';
            return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const formatTime24Hour = (dateObj: Date) => {
            const h = dateObj.getUTCHours();
            const m = dateObj.getUTCMinutes();
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            const dayOfWeek = daysOfWeekMap[d.getDay()];

            const fullDayLeave = leaves.find(l => {
                const ls = new Date(l.start_date);
                const le = new Date(l.end_date);
                ls.setHours(0,0,0,0);
                le.setHours(0,0,0,0);
                return !l.doctor_availability_id && ls <= d && le >= d;
            });

            const dayPartialLeaves = leaves.filter(l => {
                const ls = new Date(l.start_date);
                const le = new Date(l.end_date);
                ls.setHours(0,0,0,0);
                le.setHours(0,0,0,0);
                return l.doctor_availability_id && ls <= d && le >= d;
            });

            const standardSlots = weeklySchedule
                .filter(s => s.day_of_week.toUpperCase() === dayOfWeek.toUpperCase())
                .map(s => ({
                    ...s,
                    start_time_formatted: formatTime24Hour(s.start_time),
                    end_time_formatted: formatTime24Hour(s.end_time),
                    start_time_12h: formatTime12Hour(s.start_time),
                    end_time_12h: formatTime12Hour(s.end_time),
                }));

            let slots: any[] = [];
            if (!fullDayLeave) {
                slots = standardSlots
                    .filter(s => !dayPartialLeaves.some(l => l.doctor_availability_id === s.doctor_availability_id))
                    .map(s => {
                        const bookedCount = (bookingsMap[dateStr] && bookingsMap[dateStr][s.doctor_availability_id]) || 0;
                        const max = s.maximum_appointments || 0;
                        const remaining = max - bookedCount;

                        let ui_color: string;
                        let ui_available_text: string;

                        if (max === 0) {
                            ui_color = 'grey';
                            ui_available_text = 'Not Available';
                        } else if (remaining <= 0) {
                            ui_color = 'grey';
                            ui_available_text = 'Full';
                        } else if (remaining === 1) {
                            ui_color = 'red';
                            ui_available_text = '1 slot left';
                        } else if (remaining <= 3) {
                            ui_color = 'yellow';
                            ui_available_text = `${remaining} slots left`;
                        } else {
                            ui_color = 'green';
                            ui_available_text = 'Available';
                        }

                        return {
                            ...s,
                            booked_count: bookedCount,
                            ui_color,
                            ui_available_text
                        };
                    });
            }

            const formattedPartialLeaves = dayPartialLeaves.map(l => {
                const linkedSlot = weeklySchedule.find(s => s.doctor_availability_id === l.doctor_availability_id);
                return {
                    ...l,
                    start_time_formatted: linkedSlot ? formatTime24Hour(linkedSlot.start_time) : null,
                    end_time_formatted: linkedSlot ? formatTime24Hour(linkedSlot.end_time) : null,
                    start_time_12h: linkedSlot ? formatTime12Hour(linkedSlot.start_time) : null,
                    end_time_12h: linkedSlot ? formatTime12Hour(linkedSlot.end_time) : null,
                };
            });

            effectiveSchedule[dateStr] = {
                date: dateStr,
                dayOfWeek,
                isFullDayLeave: !!fullDayLeave,
                fullDayLeave: fullDayLeave || null,
                slots,
                standardSlots,
                partialLeaves: formattedPartialLeaves,
            };
        }

        return effectiveSchedule;
    }

    public async createDoctorAvailability(staffId: number, slot: DoctorAvailabilitySlotDto) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        const created = await this.doctorRepository.createDoctorAvailability(staffId, slot);
        return DoctorMapper.toAvailabilityDto(created);
    }

    public async updateDoctorAvailability(slotId: number, slot: DoctorAvailabilitySlotDto) {
        const updated = await this.doctorRepository.updateDoctorAvailability(slotId, slot);
        return DoctorMapper.toAvailabilityDto(updated);
    }

    public async deleteDoctorAvailability(slotId: number) {
        return this.doctorRepository.softDeleteDoctorAvailability(slotId);
    }

    public async getDoctorLeaves(staffId: number) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        const [leaves, slots] = await Promise.all([
            this.doctorRepository.getDoctorLeaves(staffId),
            this.doctorRepository.getDoctorAvailability(staffId)
        ]);
        return DoctorMapper.toLeaveListDto(leaves, slots);
    }

    public async createDoctorLeave(staffId: number, leave: DoctorLeaveDto) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        const created = await this.doctorRepository.createDoctorLeave(staffId, leave);
        const slots = await this.doctorRepository.getDoctorAvailability(staffId);
        const linkedSlot = slots.find(s => s.doctor_availability_id === created.doctor_availability_id);
        return DoctorMapper.toLeaveDto(created, linkedSlot);
    }

    public async updateDoctorLeave(leaveId: number, leave: DoctorLeaveDto) {
        const updated = await this.doctorRepository.updateDoctorLeave(leaveId, leave);
        const slots = await this.doctorRepository.getDoctorAvailability(updated.doctor_staff_id);
        const linkedSlot = slots.find(s => s.doctor_availability_id === updated.doctor_availability_id);
        return DoctorMapper.toLeaveDto(updated, linkedSlot);
    }

    public async deleteDoctorLeave(leaveId: number) {
        return this.doctorRepository.deleteDoctorLeave(leaveId);
    }
}
