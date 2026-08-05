import { PrismaClient } from "@generated/prisma/client";

export class PatientOtpRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(data: { whatsapp_number: string; otp_code_hash: string; expires_at: Date }) {
        return this.prisma.patientOtpVerification.create({ data });
    }

    public async countRecentByNumber(whatsappNumber: string, since: Date): Promise<number> {
        return this.prisma.patientOtpVerification.count({
            where: { whatsapp_number: whatsappNumber, created_at: { gte: since } },
        });
    }

    public async findLatestUnverified(whatsappNumber: string) {
        return this.prisma.patientOtpVerification.findFirst({
            where: { whatsapp_number: whatsappNumber, verified_at: null },
            orderBy: { created_at: "desc" },
        });
    }

    public async incrementAttempt(id: number) {
        return this.prisma.patientOtpVerification.update({
            where: { otp_verification_id: id },
            data: { attempt_count: { increment: 1 } },
        });
    }

    public async markVerified(id: number) {
        return this.prisma.patientOtpVerification.update({
            where: { otp_verification_id: id },
            data: { verified_at: new Date() },
        });
    }

    public async findLatestVerified(whatsappNumber: string, since: Date) {
        return this.prisma.patientOtpVerification.findFirst({
            where: { whatsapp_number: whatsappNumber, verified_at: { gte: since } },
            orderBy: { verified_at: "desc" },
        });
    }

    public async deleteById(id: number) {
        return this.prisma.patientOtpVerification.delete({ where: { otp_verification_id: id } });
    }
}
