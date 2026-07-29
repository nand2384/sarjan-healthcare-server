import { PasskeyRepository } from "./passkey.repository";
import { AuthRepository } from "@modules/auth/auth.repository";
import { SessionService } from "@modules/session/session.service";
import { AppError, ErrorCode } from "@errors";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { PasskeyDeviceType } from "@generated/prisma/client";
import type { VerifyRegistrationRequestDto, VerifyAuthenticationRequestDto } from "./passkey.dto";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import type { StaffWithRoles } from "@modules/session/session.types";

import { env } from "@config";

// Constants for WebAuthn RP Configuration
const rpName = env.NODE_ENV === "production" ? env.PASSKEY_RP_NAME || "Sarjan Healthcare" : "Sarjan Healthcare";
const rpID = env.NODE_ENV === "production" ? env.PASSKEY_RP_ID || "localhost" : "localhost";
const origin = env.NODE_ENV === "production" ? env.PASSKEY_ORIGIN || "http://localhost:5173" : "http://localhost:5173";

export class PasskeyService {
    constructor(
        private readonly passkeyRepository: PasskeyRepository,
        private readonly authRepository: AuthRepository,
        private readonly sessionService: SessionService
    ) {}

    public async generateRegistrationOptions(staffId: number) {
        const staff = await this.passkeyRepository.getStaffById(staffId);
        if (!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        const userPasskeys = await this.passkeyRepository.findPasskeysByStaffId(staffId);

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(staff.staff_id.toString())),
            userName: staff.username, 
            attestationType: "none",
            excludeCredentials: userPasskeys.map((passkey) => ({
                id: passkey.credential_id,
                transports: passkey.transports as AuthenticatorTransportFuture[],
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
            },
        });

        await this.passkeyRepository.updateStaffChallenge(staffId, options.challenge);

        return options;
    }

    public async verifyRegistration(staffId: number, body: VerifyRegistrationRequestDto) {
        const staff = await this.passkeyRepository.getStaffById(staffId);
        if (!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        const challengeRecord = await this.passkeyRepository.getStaffChallenge(staffId);
        if (!challengeRecord || !challengeRecord.current_challenge) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, "No active registration challenge found");
        }

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: challengeRecord.current_challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                requireUserVerification: true,
            });
        } catch (error: unknown) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, error instanceof Error ? error.message : "Validation failed");
        }

        if (verification.verified && verification.registrationInfo) {
            const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            const deviceTypeEnum: PasskeyDeviceType = 
                credentialDeviceType === "multiDevice" ? PasskeyDeviceType.MULTI_DEVICE : PasskeyDeviceType.SINGLE_DEVICE;

            await this.passkeyRepository.createPasskeyCredential({
                staff_id: staffId,
                credential_id: credential.id,
                public_key: Buffer.from(credential.publicKey),
                counter: BigInt(credential.counter),
                transports: body.response.transports || [],
                device_type: deviceTypeEnum,
                backed_up: credentialBackedUp,
            });

            await this.passkeyRepository.clearStaffChallenge(staffId);

            return { verified: true };
        }

        throw new AppError(400, ErrorCode.VALIDATION_ERROR, "Registration not verified");
    }

    public async generateAuthenticationOptions(identifier: string) {
        const staff = await this.passkeyRepository.findStaffByUsernameOrEmail(identifier);
        
        if (!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        const userPasskeys = await this.passkeyRepository.findPasskeysByStaffId(staff.staff_id);

        if (!userPasskeys || userPasskeys.length === 0) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, "No passkeys registered for this account.");
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: userPasskeys.map((passkey) => ({
                id: passkey.credential_id,
                transports: passkey.transports as AuthenticatorTransportFuture[],
            })),
            userVerification: "preferred",
        });

        await this.passkeyRepository.updateStaffChallenge(staff.staff_id, options.challenge);

        return options;
    }

    public async verifyAuthentication(identifier: string, body: VerifyAuthenticationRequestDto['payload'], ipAddress: string | null, userAgent: string | null) {
        const staff = await this.passkeyRepository.findStaffByUsernameOrEmail(identifier);
        
        if (!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        const challengeRecord = await this.passkeyRepository.getStaffChallenge(staff.staff_id);
        if (!challengeRecord || !challengeRecord.current_challenge) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, "No active authentication challenge found");
        }

        const passkey = await this.passkeyRepository.findPasskeyByCredentialId(body.id);
        if (!passkey || passkey.staff_id !== staff.staff_id) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, "Authenticator is not registered with this user");
        }

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge: challengeRecord.current_challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                credential: {
                    id: passkey.credential_id,
                    publicKey: new Uint8Array(passkey.public_key as Buffer),
                    counter: Number(passkey.counter),
                    transports: passkey.transports as AuthenticatorTransportFuture[],
                },
                requireUserVerification: true,
            });
        } catch (error: unknown) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, error instanceof Error ? error.message : "Validation failed");
        }

        if (verification.verified && verification.authenticationInfo) {
            const { newCounter } = verification.authenticationInfo;

            await this.passkeyRepository.updatePasskeyCounter(passkey.credential_id, BigInt(newCounter));
            await this.passkeyRepository.clearStaffChallenge(staff.staff_id);
            await this.passkeyRepository.updateStaffLastLogin(staff.staff_id);

            const session = await this.sessionService.createSession(staff as unknown as StaffWithRoles, ipAddress, userAgent);

            return {
                verified: true,
                staff,
                session
            };
        }

        throw new AppError(400, ErrorCode.VALIDATION_ERROR, "Authentication failed");
    }

    public async getPasskeys(staffId: number) {
        const passkeys = await this.passkeyRepository.findPasskeysByStaffId(staffId);
        return passkeys.map(p => ({
            id: p.credential_id,
            deviceType: p.device_type,
            deviceName: p.device_name,
            backedUp: p.backed_up,
            createdAt: p.created_at,
            lastUsedAt: p.last_used_at
        }));
    }

    public async updatePasskeyName(staffId: number, credentialId: string, name: string) {
        const passkey = await this.passkeyRepository.findPasskeyByCredentialId(credentialId);
        if (!passkey || passkey.staff_id !== staffId) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Passkey not found");
        }

        if (!name || name.trim() === "") {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, "Name cannot be empty");
        }

        await this.passkeyRepository.updatePasskeyName(credentialId, name.trim(), staffId);
        return { success: true };
    }
}