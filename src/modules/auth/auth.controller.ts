import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CompleteActivationRequestDto, CompleteActivationResponseDto, GetProfileDetailDto, LoginResponseDto, MeResponseDto, ResendActivationResponseDto, UpdateProfileRequestDto, UpdateProfileResponseDto, VerifyActivationResponseDto } from "./auth.dtos";
import { env } from "@config";

export class AuthController {
    constructor(private readonly authService: AuthService) {}

    public async login(req: Request, res: Response) {
        const { staff, session } = await this.authService.login({
            ...req.body,
            ipAddress: req.ip ?? null,
            userAgent: req.get("User-agent") ?? null,
        });

        res.cookie(env.SESSION_COOKIE_NAME, session.session_id, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: env.SESSION_TTL_SECONDS * 1000,
        });

        const response: LoginResponseDto = {
            staff_id: Number(staff.staff_id),
            username: staff.username,
            roles: staff.staff_roles.map((role) => role.role.role_name.toLowerCase()),
        };

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: response,
        });
    }

    public async logout(req: Request, res: Response) {
        const sessionId = req.cookies[env.SESSION_COOKIE_NAME];

        await this.authService.logout(sessionId);

        res.clearCookie(env.SESSION_COOKIE_NAME);

        return res.status(200).json({
            success: true,
            message: "Logout successful.",
        });
    }

    public async me(req: Request, res: Response) {
        const session = await this.authService.me(req.session);

        const response: MeResponseDto = {
            staff_id: Number(session.staff_id),
            username: session.username,
            roles: session.roles as MeResponseDto["roles"],
        };

        return res.status(200).json({
            success: true,
            data: response,
        });
    }

    public async verifyActivation(req: Request, res: Response): Promise<Response<VerifyActivationResponseDto>> {
        const { activationToken } = req.body;
        const response = await this.authService.verifyActivation(activationToken);

        return res.status(200).json({
            success: true,
            data: response,
        });
    }

    public async completeActivation(req: Request, res: Response): Promise<Response<CompleteActivationResponseDto>> {
        const { staff_id, activationToken, password }: CompleteActivationRequestDto = req.body;
        await this.authService.activateStaffAccount(staff_id, password, activationToken);

        return res.status(200).json({
            success: true,
            message: "Account activated successfully",
        });
    }

    public async resendActivation(req: Request, res: Response): Promise<Response<ResendActivationResponseDto>> {
        const { staff_id }: { staff_id: number } = req.body;
        const response = await this.authService.resendActivation(staff_id);

        return res.status(200).json({
            success: true,
            message: response.message,
        });
    }

    public async getProfileDetail(req: Request, res: Response): Promise<Response<GetProfileDetailDto>> {
        const response = await this.authService.getProfileDetail(req.session.staff_id);

        return res.status(200).json({
            success: true,
            data: response,
        });
    }

    public async updateProfile(req: Request, res: Response): Promise<Response<UpdateProfileResponseDto>> {
        const { firstName, lastName, mobileNumber }: UpdateProfileRequestDto = req.body;
        const updatedProfile = await this.authService.updateProfile(req.session.staff_id, firstName, lastName, mobileNumber);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile,
        });
    }

    public async changePassword(req: Request, res: Response) {
        const { currentPassword, newPassword } = req.body;
        await this.authService.changePassword(req.session.staff_id, req.session.session_id, currentPassword, newPassword);

        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    }

    public async getSessions(req: Request, res: Response) {
        const sessions = await this.authService.getActiveSessions(
            req.session.staff_id, 
            req.session.session_id
        );

        return res.status(200).json({
            success: true,
            data: sessions,
        });
    }

    public async revokeSession(req: Request, res: Response) {
        const sessionId = req.params.sessionId as string;
        await this.authService.revokeSession(req.session.staff_id, sessionId);

        return res.status(200).json({
            success: true,
            message: "Session revoked successfully",
        });
    }

    public async revokeOtherSessions(req: Request, res: Response) {
        await this.authService.revokeAllOtherSessions(req.session.staff_id, req.session.session_id);

        return res.status(200).json({
            success: true,
            message: "All other sessions revoked successfully",
        });
    }
}
