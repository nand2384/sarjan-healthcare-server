import bcrypt from "bcrypt";

import { AppError, ErrorCode } from "@errors";
import { AuthRepository } from "./auth.repository";
import { LoginRequestDto, VerifyActivationResponse } from "./auth.dtos";
import { SessionService } from "@modules/session";
import { env } from "node:process";
import { MailerService } from "mailer";
import { logger } from "@logger";

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly sessionService: SessionService,
        private readonly mailerService: MailerService,
    ) {}

    public async login(loginRequest: LoginRequestDto) {
        const { username, password, ipAddress, userAgent } = loginRequest;

        const staff = await this.authRepository.findStaffForLogin(username);

        if (!staff) {
            throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
        }

        if (staff.deleted_at) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Account does not exist");
        }

        if (staff.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled");
        }

        if (!staff.is_account_activated || !staff.password_hash) {
            throw new AppError(403, ErrorCode.ACCOUNT_NOT_ACTIVATED, "Account has not been activated yet");
        }

        const isPasswordValid = await bcrypt.compare(password, staff.password_hash!);

        if (!isPasswordValid) {
            throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
        }

        const session = await this.sessionService.createSession(staff, ipAddress, userAgent);

        return {
            staff,
            session,
        };
    }

    public async logout(sessionId: string) {
        await this.sessionService.deleteSession(sessionId);
    }

    public async me(session: Express.Request["session"]) {
        const staffId = Number(session.staff_id);
        const profile = await this.authRepository.getProfileDetail(staffId);
        
        if (!profile) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Account not found");
        }

        if (profile.deleted_at || profile.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled or deleted");
        }

        return {
            staff_id: staffId,
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            mobile_number: profile.mobile_number,
            roles: profile.staff_roles.map((role) => role.role.role_name.toLowerCase()),
        };
    }

    public async verifyActivation(activationToken: string): Promise<VerifyActivationResponse> {
        const detail = await this.authRepository.getStaffActivationDetail(activationToken);

        if(!detail) {
            throw new AppError(404, ErrorCode.INVALID_ACTIVATION_TOKEN, "Invalid Activation Token.");
        }

        if(detail.activation_token_expires_at! < new Date()) {
            throw new AppError(404, ErrorCode.INVALID_ACTIVATION_TOKEN, "Activation Token has expired.");
        }

        return {
            staff_id: detail.staff_id,
            first_name: detail.first_name,
            username: detail.username,
            activationToken,
        }
    }

    public async activateStaffAccount(staffId: number, password: string, activationToken: string) {
        const detail = await this.authRepository.getStaffActivationDetail(activationToken);

        if(!detail) {
            throw new AppError(404, ErrorCode.INVALID_ACTIVATION_TOKEN, "Invalid Activation Token.");
        }

        if(detail.activation_token_expires_at! < new Date()) {
            throw new AppError(404, ErrorCode.INVALID_ACTIVATION_TOKEN, "Activation Token has expired.");
        }

        if(detail.staff_id !== staffId || detail.activation_token !== activationToken) {
            throw new AppError(403, ErrorCode.UNAUTHORIZED, "Unauthorized access.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await this.authRepository.activateStaffAccount(staffId, hashedPassword);

        return {
            message: "Account activated successfully",
        };
    }

    public async resendActivation(staffId: number) {
        const staff = await this.authRepository.findStaffActivationDetails(staffId);

        if(!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        if(staff.deleted_at) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Account has been deleted");
        }

        if(staff.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled");
        }

        if(staff.is_account_activated) {
            throw new AppError(403, ErrorCode.ACCOUNT_ALREADY_ACTIVATED, "Account has already been activated");
        }

        const activationToken = crypto.randomUUID();
        const activationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const updatedStaff = await this.authRepository.updateStaffActivation(staffId, activationToken, activationTokenExpiresAt);

        const activationLink = `${env.FRONTEND_URL}/activate-account?token=${activationToken}`;

        this.mailerService.sendStaffActivationMail({
            to: updatedStaff.email,
            firstName: updatedStaff.first_name,
            username: updatedStaff.username,
            activationLink,
        }).catch(error => {
            logger.error(error, "Failed to send staff activation email.");
        });

        return {
            message: "Activation email sent successfully",
        };
    }

    public async getProfileDetail(staffId: number) {
        const profile = await this.authRepository.getProfileDetail(staffId);

        if(!profile) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        if(profile.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled");
        }

        if(profile.deleted_at) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Account not found");
        }

        return {
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            mobile_number: profile.mobile_number,
            roles: profile.staff_roles.map((role) => role.role.role_name.toLowerCase()),
        };
    }

    public async updateProfile(staffId: number, firstName: string, lastName: string, mobileNumber: string) {
        const staff = await this.authRepository.findStaffById(staffId);

        if(!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        if(staff.deleted_at) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        if(staff.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled");
        }

        if(!staff.is_account_activated) {
            throw new AppError(403, ErrorCode.ACCOUNT_NOT_ACTIVATED, "Account not activated");
        }

        const updatedProfile = await this.authRepository.updateProfile(staffId, firstName, lastName, mobileNumber);

        return {
            first_name: updatedProfile.first_name,
            last_name: updatedProfile.last_name,
            email: updatedProfile.email,
            mobile_number: updatedProfile.mobile_number,
        };
    }

    public async changePassword(staffId: number, currentSessionId: string, currentPassword: string, newPassword: string) {
        const staff = await this.authRepository.findStaffById(staffId);

        if(!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        if(!staff.is_account_activated) {
            throw new AppError(403, ErrorCode.ACCOUNT_NOT_ACTIVATED, "Account not activated");
        }

        if(staff.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled");
        }

        if(staff.deleted_at) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, staff.password_hash!);

        if(!isCurrentPasswordValid) {
            throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid current password");
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await this.authRepository.changePassword(staffId, hashedPassword);
        
        await this.sessionService.revokeAllOtherSessions(staffId, currentSessionId);
        
        return;
    }

    public async getActiveSessions(staffId: number, currentSessionId: string) {
        return await this.sessionService.getActiveSessions(staffId, currentSessionId);
    }

    public async revokeSession(staffId: number, sessionIdToRevoke: string) {
        // Find session to ensure it belongs to the same user
        const session = await this.sessionService.getSession(sessionIdToRevoke);
        if (!session) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Session not found");
        }
        if (session.staff_id !== staffId) {
            throw new AppError(403, ErrorCode.UNAUTHORIZED, "Unauthorized to revoke this session");
        }
        await this.sessionService.deleteSession(sessionIdToRevoke);
    }

    public async revokeAllOtherSessions(staffId: number, currentSessionId: string) {
        await this.sessionService.revokeAllOtherSessions(staffId, currentSessionId);
    }

    public async requestPasswordReset(email: string) {
        const staff = await this.authRepository.findStaffByEmail(email);

        // Always return generic success response to prevent email enumeration
        if (!staff) {
            return { success: true, message: "If an account exists with that email, you will receive password reset instructions." };
        }

        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        await this.authRepository.setPasswordResetToken(staff.staff_id, resetToken, expiresAt);

        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        try {
            await this.mailerService.sendPasswordResetMail({
                to: email,
                firstName: staff.first_name,
                username: staff.username,
                resetLink,
            });
        } catch (error) {
            logger.error({ err: error }, `Failed to send password reset email to ${email}`);
        }

        return { success: true, message: "If an account exists with that email, you will receive password reset instructions." };
    }

    public async verifyPasswordResetToken(resetToken: string) {
        const staff = await this.authRepository.getStaffByPasswordResetToken(resetToken);

        if (!staff) {
            throw new AppError(404, ErrorCode.INVALID_RESET_TOKEN, "Invalid or expired password reset link");
        }

        if (!staff.password_reset_token_expires_at || staff.password_reset_token_expires_at < new Date()) {
            throw new AppError(401, ErrorCode.INVALID_RESET_TOKEN, "Password reset link has expired");
        }

        return {
            staff_id: staff.staff_id,
            first_name: staff.first_name,
            username: staff.username,
            resetToken: staff.password_reset_token!,
        };
    }

    public async completePasswordReset(staffId: number, resetToken: string, newPassword: string) {
        const staff = await this.authRepository.getStaffByPasswordResetToken(resetToken);

        if (!staff || staff.staff_id !== staffId) {
            throw new AppError(401, ErrorCode.INVALID_RESET_TOKEN, "Invalid password reset token");
        }

        if (!staff.password_reset_token_expires_at || staff.password_reset_token_expires_at < new Date()) {
            throw new AppError(401, ErrorCode.INVALID_RESET_TOKEN, "Password reset link has expired");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.authRepository.completePasswordReset(staffId, hashedPassword);

        // Revoke all existing sessions for this staff member
        await this.sessionService.revokeAllSessionsForStaff(staffId);

        return { success: true, message: "Password reset successfully. Please log in with your new password." };
    }

    public async adminTriggerPasswordReset(staffId: number, auditContext: { performed_by_staff_id: number }) {
        const staff = await this.authRepository.findStaffById(staffId);

        if (!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff not found");
        }

        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.authRepository.setPasswordResetToken(staffId, resetToken, expiresAt);

        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        try {
            await this.mailerService.sendPasswordResetMail({
                to: staff.email,
                firstName: staff.first_name,
                username: staff.username,
                resetLink,
            });
        } catch (error) {
            logger.error({ err: error }, `Failed to send password reset email for staff ${staffId}`);
        }

        return { success: true, message: "Password reset email sent successfully" };
    }
}
