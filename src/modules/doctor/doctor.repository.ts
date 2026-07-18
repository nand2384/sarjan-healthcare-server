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
}
