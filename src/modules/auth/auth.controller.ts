import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginResponseDto, MeResponseDto } from "./auth.dtos";
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
            roles: staff.staff_roles.map((role) => role.role.role_name),
        };

        return res.status(200).json({
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
            staff_id: session.staff_id,
            username: session.username,
            roles: session.roles as MeResponseDto["roles"],
        };

        return res.status(200).json({
            success: true,
            data: response,
        });
    }
}
