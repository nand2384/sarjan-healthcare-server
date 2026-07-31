import { PrismaClient, PasskeyDeviceType } from "@generated/prisma/client";

export class PasskeyRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getStaffById(staffId: number) {
        return await this.prisma.staff.findUnique({
            where: {
                staff_id: staffId,
            },
            select: {
                staff_id: true,
                username: true,
                email: true,
            },
        });
    }

    public async getStaffChallenge(staffId: number) {
        return await this.prisma.staff.findUnique({
            where: { staff_id: staffId },
            select: { current_challenge: true },
        });
    }

    public async findStaffByUsernameOrEmail(identifier: string) {
        return await this.prisma.staff.findFirst({
            where: {
                username: identifier,
                deleted_at: null,
                is_disabled: false,
            },
            select: {
                staff_id: true,
                username: true,
                email: true,
                current_challenge: true,
                staff_roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
    }

    public async updateStaffChallenge(staffId: number, challenge: string) {
        await this.prisma.staff.update({
            where: { staff_id: staffId },
            data: { 
                current_challenge: challenge,
                challenge_created_at: new Date(),
            },
        });
    }

    public async clearStaffChallenge(staffId: number) {
        await this.prisma.staff.update({
            where: { staff_id: staffId },
            data: { 
                current_challenge: null,
                challenge_created_at: null,
            },
        });
    }

    public async updateStaffLastLogin(staffId: number) {
        await this.prisma.staff.update({
            where: { staff_id: staffId },
            data: { last_login_at: new Date() }
        });
    }

    public async findPasskeysByStaffId(staffId: number) {
        return await this.prisma.passkeyCredential.findMany({
            where: { staff_id: staffId },
        });
    }

    public async findPasskeyByCredentialId(credentialId: string) {
        return await this.prisma.passkeyCredential.findUnique({
            where: { credential_id: credentialId },
            include: { staff: true },
        });
    }

    public async createPasskeyCredential(data: {
        staff_id: number;
        credential_id: string;
        public_key: any;
        counter: bigint;
        transports: string[];
        device_type: PasskeyDeviceType;
        backed_up: boolean;
    }) {
        return await this.prisma.passkeyCredential.create({
            data,
        });
    }

    public async updatePasskeyCounter(credentialId: string, counter: bigint) {
        await this.prisma.passkeyCredential.update({
            where: { credential_id: credentialId },
            data: { 
                counter,
                last_used_at: new Date()
            },
        });
    }

    public async updatePasskeyName(credentialId: string, deviceName: string, staffId: number) {
        await this.prisma.passkeyCredential.updateMany({
            where: {
                credential_id: credentialId,
                staff_id: staffId
            },
            data: {
                device_name: deviceName,
            }
        });
        return this.findPasskeyByCredentialId(credentialId);
    }

    public async deletePasskeyByCredentialId(credentialId: string, staffId: number) {
        return await this.prisma.passkeyCredential.deleteMany({
            where: {
                credential_id: credentialId,
                staff_id: staffId,
            },
        });
    }
}