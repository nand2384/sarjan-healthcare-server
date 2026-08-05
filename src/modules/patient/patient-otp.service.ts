import crypto from "crypto";
import { AppError, ErrorCode } from "@errors";
import { logger } from "@logger";
import { WhatsAppService } from "whatsapp";
import { PatientOtpRepository } from "./patient-otp.repository";

const OTP_EXPIRY_MINUTES = 5;
const OTP_CLAIM_WINDOW_MINUTES = 30;
const MAX_SEND_ATTEMPTS_PER_WINDOW = 5;
const SEND_WINDOW_MINUTES = 15;
const MAX_VERIFY_ATTEMPTS = 5;

function hashOtp(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
}

export class PatientOtpService {
    constructor(
        private readonly patientOtpRepository: PatientOtpRepository,
        private readonly whatsAppService: WhatsAppService,
    ) {}

    public async sendOtp(whatsappNumber: string): Promise<{ success: true; message: string }> {
        const since = new Date(Date.now() - SEND_WINDOW_MINUTES * 60 * 1000);
        const recentCount = await this.patientOtpRepository.countRecentByNumber(whatsappNumber, since);

        if (recentCount >= MAX_SEND_ATTEMPTS_PER_WINDOW) {
            throw new AppError(429, ErrorCode.TOO_MANY_REQUESTS, "Too many OTP requests for this number. Please try again later.");
        }

        const code = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await this.patientOtpRepository.create({
            whatsapp_number: whatsappNumber,
            otp_code_hash: hashOtp(code),
            expires_at: expiresAt,
        });

        await this.whatsAppService
            .sendOtpMessage({ whatsappNumber, otpCode: code })
            .catch((error) => logger.error({ err: error, whatsappNumber }, "Failed to send WhatsApp OTP message"));

        return { success: true, message: "OTP sent" };
    }

    public async verifyOtp(whatsappNumber: string, code: string): Promise<{ verified: true }> {
        const record = await this.patientOtpRepository.findLatestUnverified(whatsappNumber);

        if (!record) {
            throw new AppError(404, ErrorCode.INVALID_OTP, "No pending OTP found for this number");
        }

        if (record.attempt_count >= MAX_VERIFY_ATTEMPTS) {
            throw new AppError(429, ErrorCode.TOO_MANY_REQUESTS, "Too many incorrect attempts. Please request a new OTP.");
        }

        if (record.expires_at < new Date()) {
            throw new AppError(400, ErrorCode.INVALID_OTP, "OTP has expired. Please request a new one.");
        }

        if (record.otp_code_hash !== hashOtp(code)) {
            await this.patientOtpRepository.incrementAttempt(record.otp_verification_id);
            throw new AppError(400, ErrorCode.INVALID_OTP, "Incorrect OTP code");
        }

        await this.patientOtpRepository.markVerified(record.otp_verification_id);

        return { verified: true };
    }

    /**
     * Called at registration time. Consumes (deletes) the most recent verified
     * OTP record for this number within the claim window and returns its
     * verified_at timestamp to stamp onto `Patient.whatsapp_verified_at` —
     * deleting on consumption prevents the same verified OTP being reused
     * across multiple patient registrations.
     */
    public async consumeVerification(whatsappNumber: string): Promise<Date | null> {
        const since = new Date(Date.now() - OTP_CLAIM_WINDOW_MINUTES * 60 * 1000);
        const record = await this.patientOtpRepository.findLatestVerified(whatsappNumber, since);

        if (!record?.verified_at) return null;

        await this.patientOtpRepository.deleteById(record.otp_verification_id);
        return record.verified_at;
    }
}
