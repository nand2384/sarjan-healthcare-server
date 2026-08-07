import bcrypt from "bcrypt";
import crypto from "crypto";

import { AuditAction, AuditEntityType } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";
import { AuthRepository } from "./auth.repository";
import { LoginRequestDto, VerifyActivationResponse } from "./auth.dtos";
import { SessionService } from "@modules/session";
import { StaffRepository } from "@modules/staff/staff.repository";
import { AuditService } from "@modules/audit/audit.service";
import { SystemSettingService } from "@modules/system-setting/system-setting.service";
import { SystemSettingKey, SystemSettingBooleanKey } from "constants/system-setting.constants";
import { USER_ROLE } from "common/common.schema";
import { env } from "@config";
import { MailerService } from "mailer";
import { logger } from "@logger";

const DEVELOPER_ROLE_NAME = "Developer";

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly sessionService: SessionService,
        private readonly mailerService: MailerService,
        private readonly staffRepository: StaffRepository,
        private readonly auditService: AuditService,
        private readonly systemSettingService: SystemSettingService,
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

        if (staff.locked_until && staff.locked_until > new Date()) {
            const minutesLeft = Math.max(1, Math.ceil((staff.locked_until.getTime() - Date.now()) / 60000));
            throw new AppError(401, ErrorCode.ACCOUNT_LOCKED, `Account temporarily locked due to repeated failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`);
        }

        if (!staff.is_account_activated || !staff.password_hash) {
            throw new AppError(403, ErrorCode.ACCOUNT_NOT_ACTIVATED, "Account has not been activated yet");
        }

        const isPasswordValid = await bcrypt.compare(password, staff.password_hash!);

        if (!isPasswordValid) {
            await this.handleFailedLoginAttempt(staff, ipAddress, userAgent);
            throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
        }

        const roles = staff.staff_roles.map((staffRole) => staffRole.role.role_name.toLowerCase());
        const hasMaintenanceBypassRole = roles.includes(USER_ROLE.ADMIN) || roles.includes(USER_ROLE.DEVELOPER);

        if (!hasMaintenanceBypassRole) {
            const maintenanceModeEnabled = await this.systemSettingService.getBoolean(SystemSettingBooleanKey.MAINTENANCE_MODE_ENABLED);
            if (maintenanceModeEnabled) {
                // Deliberately blocked here rather than letting them log in — there's
                // nothing for a non-admin/developer dashboard to show while every other
                // API route is 503ing, so a "successful" login would just strand them
                // on a broken screen instead of telling them what's actually going on.
                throw new AppError(503, ErrorCode.MAINTENANCE_MODE, "The site is temporarily down for maintenance. Please check back shortly.");
            }
        }

        await this.authRepository.resetLoginAttempts(staff.staff_id);

        const session = await this.sessionService.createSession(staff, ipAddress, userAgent);

        return {
            staff,
            session,
        };
    }

    /**
     * Tracks a wrong-password attempt against a real account within a rolling
     * window, logs it to the audit trail every time (cheap forensic record),
     * and — only on the specific attempt that crosses the threshold — locks
     * the account and fans out a security alert to every developer. This
     * makes the alert self-limiting to once per lockout episode, since every
     * attempt during the lockout window itself is rejected before reaching
     * this method at all.
     */
    private async handleFailedLoginAttempt(
        staff: { staff_id: number; first_name: string; username: string; email: string; failed_login_count: number; failed_login_window_started_at: Date | null },
        ipAddress: string | null,
        userAgent: string | null,
    ): Promise<void> {
        const [maxAttempts, windowMinutes, lockoutMinutes] = await Promise.all([
            this.systemSettingService.getNumber(SystemSettingKey.FAILED_LOGIN_MAX_ATTEMPTS),
            this.systemSettingService.getNumber(SystemSettingKey.FAILED_LOGIN_WINDOW_MINUTES),
            this.systemSettingService.getNumber(SystemSettingKey.LOCKOUT_DURATION_MINUTES),
        ]);
        const windowMs = windowMinutes * 60 * 1000;
        const lockoutMs = lockoutMinutes * 60 * 1000;

        const now = new Date();
        const windowStillActive = staff.failed_login_window_started_at
            && now.getTime() - staff.failed_login_window_started_at.getTime() < windowMs;

        const newCount = windowStillActive ? staff.failed_login_count + 1 : 1;
        const windowStartedAt = windowStillActive ? staff.failed_login_window_started_at! : now;
        const isLockingNow = newCount >= maxAttempts;
        const lockedUntil = isLockingNow ? new Date(now.getTime() + lockoutMs) : null;

        await this.authRepository.recordFailedLoginAttempt(staff.staff_id, {
            failed_login_count: newCount,
            failed_login_window_started_at: windowStartedAt,
            locked_until: lockedUntil,
        });

        await this.auditService.log({
            entity_type: AuditEntityType.STAFF,
            entity_id: staff.staff_id.toString(),
            action: isLockingNow ? AuditAction.ACCOUNT_LOCKED : AuditAction.FAILED_LOGIN_ATTEMPT,
            new_values: { failed_login_count: newCount, ip_address: ipAddress, user_agent: userAgent },
            ip_address: ipAddress ?? undefined,
            user_agent: userAgent ?? undefined,
        }).catch((error) => logger.error({ err: error }, "Failed to write audit log for failed login attempt"));

        if (isLockingNow && lockedUntil) {
            this.sendSecurityAlert(staff, newCount, lockedUntil, ipAddress).catch((error) =>
                logger.error({ err: error, staffId: staff.staff_id }, "Failed to send security alert email"));

            this.sendAccountLockedNotice(staff, newCount, lockedUntil).catch((error) =>
                logger.error({ err: error, staffId: staff.staff_id }, "Failed to send account locked notice email"));
        }
    }

    /**
     * Emails the locked-out owner a password reset link. Reusing the same
     * reset-token flow as forgot-password means completing it also clears
     * the lockout (see AuthRepository.completePasswordReset) — the account
     * owner isn't stuck waiting out the full lockout if they act quickly.
     */
    private async sendAccountLockedNotice(
        staff: { staff_id: number; first_name: string; username: string; email: string },
        failedAttempts: number,
        lockedUntil: Date,
    ): Promise<void> {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.authRepository.setPasswordResetToken(staff.staff_id, resetToken, expiresAt);

        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const lockedUntilFormatted = lockedUntil.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

        await this.mailerService.sendAccountLockedMail({
            to: staff.email,
            firstName: staff.first_name,
            username: staff.username,
            failedAttempts,
            lockedUntilFormatted,
            resetLink,
        });
    }

    private async sendSecurityAlert(
        staff: { first_name: string; username: string },
        failedAttempts: number,
        lockedUntil: Date,
        ipAddress: string | null,
    ): Promise<void> {
        const developerRoleId = await this.authRepository.findRoleIdByName(DEVELOPER_ROLE_NAME);
        if (!developerRoleId) {
            logger.warn("No Developer role found — skipping security alert fan-out");
            return;
        }

        const developers = await this.staffRepository.getActiveStaffIdsByRole(developerRoleId);
        const lockedUntilFormatted = lockedUntil.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

        await Promise.all(developers.map((developer) =>
            this.mailerService.sendSecurityAlert({
                to: developer.email,
                developerFirstName: developer.first_name,
                staffName: staff.first_name,
                username: staff.username,
                failedAttempts,
                lockedUntilFormatted,
                ipAddress: ipAddress ?? undefined,
            })
        ));
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

        const maintenanceModeEnabled = await this.systemSettingService.getBoolean(SystemSettingBooleanKey.MAINTENANCE_MODE_ENABLED);

        return {
            staff_id: staffId,
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            mobile_number: profile.mobile_number,
            roles: profile.staff_roles.map((role) => role.role.role_name.toLowerCase()),
            // Allow-listed endpoint (see maintenance.middleware.ts) — this is how an
            // already-logged-in, non-admin/developer client detects maintenance mode
            // (both when it turns on, to show a clear screen instead of every other
            // request 503ing forever, and when it turns off, to know it's safe to
            // resume normal polling).
            maintenance_mode: maintenanceModeEnabled,
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

        const resetToken = crypto.randomBytes(32).toString('hex');
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

        // Validate that new password is different from current password
        if (staff.password_hash) {
            const isSamePassword = await bcrypt.compare(newPassword, staff.password_hash);
            if (isSamePassword) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "New password cannot be the same as your current password");
            }
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

        const resetToken = crypto.randomBytes(32).toString('hex');
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

    public async requestEmailChange(staffId: number, newEmail: string) {
        const staff = await this.authRepository.findStaffById(staffId);
        if (!staff) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Staff account not found");
        }

        // Check if email is already in use
        const existingByEmail = await this.authRepository.findStaffByEmailExcluding(newEmail, staffId);
        if (existingByEmail) {
            throw new AppError(400, ErrorCode.EMAIL_ALREADY_IN_USE, "This email is already in use");
        }

        // Check if email is pending on another account
        const existingByPendingEmail = await this.authRepository.findStaffByPendingEmailExcluding(newEmail, staffId);
        if (existingByPendingEmail) {
            throw new AppError(400, ErrorCode.EMAIL_ALREADY_IN_USE, "This email is pending verification on another account");
        }

        const emailToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await this.authRepository.setPendingEmail(staffId, newEmail, emailToken, expiresAt);

        const confirmLink = `${env.FRONTEND_URL}/confirm-email-change?token=${emailToken}`;

        try {
            await this.mailerService.sendEmailChangeConfirmationMail({
                to: newEmail,
                firstName: staff.first_name,
                username: staff.username,
                confirmLink,
            });
        } catch (error) {
            logger.error({ err: error }, `Failed to send email change confirmation for staff ${staffId}`);
        }

        return { success: true, message: "Verification email sent to your new address. Please check your inbox." };
    }

    public async confirmEmailChange(emailToken: string) {
        const staff = await this.authRepository.getStaffByPendingEmailToken(emailToken);

        if (!staff) {
            throw new AppError(401, ErrorCode.INVALID_EMAIL_CHANGE_TOKEN, "Invalid email change link");
        }

        if (!staff.pending_email_token_expires_at || staff.pending_email_token_expires_at < new Date()) {
            throw new AppError(401, ErrorCode.INVALID_EMAIL_CHANGE_TOKEN, "Email change link has expired");
        }

        if (!staff.pending_email) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "No pending email to confirm");
        }

        await this.authRepository.confirmPendingEmail(staff.staff_id, staff.pending_email);

        return { success: true, message: "Email updated successfully" };
    }
}
