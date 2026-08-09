import { PrismaClient } from "@generated/prisma/client";

const SINGLETON_ID = 1;

export interface UpdateClinicProfileData {
    address?: string;
    phone?: string;
    email?: string;
    timings?: string;
    days_open?: string;
    about_description?: string;
}

export class ClinicProfileRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async find() {
        return this.prisma.clinicProfile.findUnique({ where: { clinic_profile_id: SINGLETON_ID } });
    }

    public async update(data: UpdateClinicProfileData) {
        return this.prisma.clinicProfile.update({ where: { clinic_profile_id: SINGLETON_ID }, data });
    }
}
