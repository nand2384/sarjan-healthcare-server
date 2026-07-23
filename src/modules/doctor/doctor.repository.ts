import { Prisma, PrismaClient, DoctorProfile } from "@generated/prisma/client";
import { DoctorListEntity, DoctorDetailEntity } from "./doctor.types";

export class DoctorRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getAllDoctors(tx?: Prisma.TransactionClient): Promise<DoctorListEntity[]> {
        const prisma = tx ?? this.prisma;

        return prisma.staff.findMany({
            where: {
                deleted_at: null,
                is_system_account: false,
                staff_roles: {
                    some: {
                        role_id: 2, // Role ID 2 is Doctor (seeded order: 1=admin, 2=doctor)
                    }
                }
            },
            orderBy: {
                created_at: "desc",
            },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                mobile_number: true,
                is_disabled: true,
                is_account_activated: true,
                last_login_at: true,
                created_at: true,
                gender: {
                    select: {
                        value_id: true,
                        value_name: true,
                    },
                },
                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            },
                        },
                    },
                },
                doctor_profile: {
                    select: {
                        specialization: true,
                        qualification: true,
                        registration_number: true,
                        biography: true,
                        experience: true,
                        is_visible_on_website: true,
                        is_accepting_appointments: true,
                    }
                }
            },
        });
    }

    public async findDoctorById(staffId: number, tx?: Prisma.TransactionClient): Promise<DoctorDetailEntity | null> {
        const db = tx ?? this.prisma;

        return db.staff.findUnique({
            where: {
                staff_id: staffId,
                deleted_at: null,
                is_system_account: false,
            },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                username: true,
                mobile_number: true,
                email: true,
                gender: {
                    select: {
                        value_id: true,
                        value_name: true,
                    }
                },
                age: true,
                street_address: true,
                city: true,
                state: true,
                pincode: true,
                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            }
                        }
                    }
                },
                doctor_profile: {
                    select: {
                        specialization: true,
                        qualification: true,
                        registration_number: true,
                        biography: true,
                        experience: true,
                        is_visible_on_website: true,
                        is_accepting_appointments: true,
                    }
                },
                is_disabled: true,
                is_account_activated: true,
                last_login_at: true,
                created_at: true,
            }
        });
    }

    public async createDoctorProfile(
        staffId: number, 
        data: Omit<Prisma.DoctorProfileUncheckedCreateInput, "doctor_profile_id" | "staff_id" | "created_at" | "updated_at">, 
        tx?: Prisma.TransactionClient
    ): Promise<DoctorProfile> {
        const db = tx ?? this.prisma;
        return db.doctorProfile.create({
            data: {
                staff_id: staffId,
                ...data,
            }
        });
    }

    public async updateDoctorProfile(
        staffId: number, 
        data: Partial<Omit<Prisma.DoctorProfileUncheckedUpdateInput, "doctor_profile_id" | "staff_id" | "created_at" | "updated_at">>, 
        tx?: Prisma.TransactionClient
    ): Promise<DoctorProfile> {
        const db = tx ?? this.prisma;
        return db.doctorProfile.update({
            where: {
                staff_id: staffId,
            },
            data,
        });
    }

    public async getBasicDoctors(tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return await prisma.staff.findMany({
            where: {
                deleted_at: null,
                is_system_account: false,
                is_disabled: false,
                // is_account_activated: true,
                staff_roles: {
                    some: {
                        role_id: 2,
                    }
                },
            },
            orderBy: {
                created_at: "desc"
            },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                doctor_profile: {
                    select: {
                        specialization: true,
                    }
                }
            },
        });
    }

    public async getDoctorAvailability(staffId: number) {
        return this.prisma.doctorAvailability.findMany({
            where: {
                doctor_staff_id: staffId,
                deleted_at: null,
            },
            orderBy: [{
                day_of_week: "asc",
            },
            {
                start_time: "asc",
            }],
        });
    }

    public async createDoctorAvailability(staffId: number, slot: any) {
        return this.prisma.doctorAvailability.create({
            data: {
                doctor_staff_id: staffId,
                day_of_week: slot.day_of_week,
                slot_name: slot.slot_name,
                start_time: new Date(`1970-01-01T${slot.start_time}:00Z`), 
                end_time: new Date(`1970-01-01T${slot.end_time}:00Z`),
                maximum_appointments: slot.maximum_appointments,
            }
        });
    }
    
    public async updateDoctorAvailability(slotId: number, slot: any) {
        return this.prisma.doctorAvailability.update({
            where: { doctor_availability_id: slotId },
            data: {
                day_of_week: slot.day_of_week,
                slot_name: slot.slot_name,
                start_time: new Date(`1970-01-01T${slot.start_time}:00Z`), 
                end_time: new Date(`1970-01-01T${slot.end_time}:00Z`),
                maximum_appointments: slot.maximum_appointments,
            }
        });
    }
    
    public async softDeleteDoctorAvailability(slotId: number) {
        return this.prisma.doctorAvailability.update({
            where: { doctor_availability_id: slotId },
            data: { deleted_at: new Date() }
        });
    }

    public async getDoctorLeaves(staffId: number) {
        return this.prisma.doctorLeave.findMany({
            where: {
                doctor_staff_id: staffId,
            },
            orderBy: {
                start_date: "asc",
            },
        });
    }

    public async getDoctorLeavesInRange(staffId: number, startDate: string, endDate: string) {
        return this.prisma.doctorLeave.findMany({
            where: {
                doctor_staff_id: staffId,
                start_date: {
                    lte: new Date(endDate),
                },
                end_date: {
                    gte: new Date(startDate),
                },
            },
            orderBy: {
                start_date: "asc",
            },
        });
    }

    public async createDoctorLeave(staffId: number, leave: any) {
        return this.prisma.doctorLeave.create({
            data: {
                doctor_staff_id: staffId,
                start_date: new Date(leave.start_date),
                end_date: new Date(leave.end_date),
                reason: leave.reason,
                doctor_availability_id: leave.doctor_availability_id,
            }
        });
    }

    public async updateDoctorLeave(leaveId: number, leave: any) {
        return this.prisma.doctorLeave.update({
            where: { doctor_leave_id: leaveId },
            data: {
                start_date: new Date(leave.start_date),
                end_date: new Date(leave.end_date),
                reason: leave.reason,
                doctor_availability_id: leave.doctor_availability_id,
            }
        });
    }

    public async deleteDoctorLeave(leaveId: number) {
        return this.prisma.doctorLeave.delete({
            where: { doctor_leave_id: leaveId }
        });
    }
}
