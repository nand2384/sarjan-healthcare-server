import { PrismaClient } from "@generated/prisma/client";
import { DoctorRepository } from "./doctor.repository";
import { CreateDoctorDto } from "./doctor.dto";
import { UpdateDoctorDto, DoctorAvailabilitySlotDto, DoctorLeaveDto } from "./doctor.schema";
import { AppError, ErrorCode } from "@errors";
import { StaffRepository } from "@modules/staff/staff.repository";
import { StaffRoleRepository } from "@modules/staff-role/staff-role.repository";
import { AuditService } from "@modules/audit/audit.service";
import { MailerService } from "mailer";
import { env } from "@config";
import crypto from "node:crypto";
import { AuditAction, AuditEntityType } from "@generated/prisma/client";
import { logger } from "@logger";

export class DoctorService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly doctorRepository: DoctorRepository,
        private readonly staffRepository: StaffRepository,
        private readonly staffRoleRepository: StaffRoleRepository,
        private readonly auditService: AuditService,
        private readonly mailerService: MailerService,
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

    public async getBasicDoctors() {
        return this.doctorRepository.getBasicDoctors();
    }

    public async getDoctorAvailability(staffId: number) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        return this.doctorRepository.getDoctorAvailability(staffId);
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

                        let ui_color = 'green';
                        let ui_available_text = 'Available';

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
        return this.doctorRepository.createDoctorAvailability(staffId, slot);
    }

    public async updateDoctorAvailability(slotId: number, slot: DoctorAvailabilitySlotDto) {
        return this.doctorRepository.updateDoctorAvailability(slotId, slot);
    }

    public async deleteDoctorAvailability(slotId: number) {
        return this.doctorRepository.softDeleteDoctorAvailability(slotId);
    }

    public async getDoctorLeaves(staffId: number) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        return this.doctorRepository.getDoctorLeaves(staffId);
    }

    public async createDoctorLeave(staffId: number, leave: DoctorLeaveDto) {
        const doctor = await this.getDoctorById(staffId);
        if (!doctor) throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        return this.doctorRepository.createDoctorLeave(staffId, leave);
    }

    public async updateDoctorLeave(leaveId: number, leave: DoctorLeaveDto) {
        return this.doctorRepository.updateDoctorLeave(leaveId, leave);
    }

    public async deleteDoctorLeave(leaveId: number) {
        return this.doctorRepository.deleteDoctorLeave(leaveId);
    }
}
