import { Request, Response } from "express";
import { SessionService } from "./session.service";

export class SessionController {
    constructor(private readonly sessionService: SessionService) {}

    public getAllActive = async (_req: Request, res: Response) => {
        const sessions = await this.sessionService.getAllActiveSessions();

        return res.status(200).json({
            success: true,
            data: sessions,
        });
    };

    public forceRevoke = async (req: Request, res: Response) => {
        const sessionId = String(req.params.sessionId);

        await this.sessionService.forceRevokeSession(sessionId, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Session revoked successfully.",
        });
    };
}
