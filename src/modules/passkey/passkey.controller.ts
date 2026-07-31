import { Request, Response, NextFunction } from "express";
import { PasskeyService } from "./passkey.service";
import { env } from "@config";
import type { 
    GenerateAuthenticationOptionsRequestDto, 
    VerifyAuthenticationRequestDto,
    VerifyRegistrationRequestDto,
    UpdatePasskeyNameRequestDto
} from "./passkey.dto";

export class PasskeyController {
    constructor(private readonly passkeyService: PasskeyService) { }

    public generateRegistrationOptions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as any).session.staff_id;
            const options = await this.passkeyService.generateRegistrationOptions(staffId);
            return res.status(200).json({
                success: true,
                message: "Generated registration options successfully.",
                data: options,
            });
        } catch (error) {
            next(error);
        }
    }

    public verifyRegistration = async (req: Request<Record<string, never>, Record<string, never>, VerifyRegistrationRequestDto>, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as any).session.staff_id;
            const result = await this.passkeyService.verifyRegistration(staffId, req.body);
            return res.status(200).json({
                success: true,
                message: "Verified registration successfully.",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    public generateAuthenticationOptions = async (req: Request<Record<string, never>, Record<string, never>, GenerateAuthenticationOptionsRequestDto>, res: Response, next: NextFunction) => {
        try {
            const { identifier } = req.body;
            if (!identifier) {
                return res.status(400).json({ 
                    success: false,
                    message: "Identifier is required" 
                });
            }
            const options = await this.passkeyService.generateAuthenticationOptions(identifier);
            return res.status(200).json({
                success: true,
                message: "Generated authentication options successfully.",
                data: options,
            });
        } catch (error) {
            next(error);
        }
    }

    public verifyAuthentication = async (req: Request<Record<string, never>, Record<string, never>, VerifyAuthenticationRequestDto>, res: Response, next: NextFunction) => {
        try {
            const { identifier, payload } = req.body;
            if (!identifier || !payload) {
                return res.status(400).json({ 
                    success: false,
                    message: "Identifier and payload are required" 
                });
            }
            const ipAddress = req.ip || null;
            const userAgent = req.headers['user-agent'] || null;

            const result = await this.passkeyService.verifyAuthentication(identifier, payload, ipAddress, userAgent);
            
            // Set cookie for session
            res.cookie(env.SESSION_COOKIE_NAME, result.session.session_id, {
                httpOnly: true,
                secure: env.NODE_ENV === "production",
                sameSite: env.NODE_ENV === "production" ? "none" : "strict",
                maxAge: env.SESSION_TTL_SECONDS * 1000,
            });

            const responseData = {
                staff_id: Number(result.staff.staff_id),
                username: result.staff.username,
                roles: result.staff.staff_roles.map((r: any) => r.role.role_name.toLowerCase()),
            };

            return res.status(200).json({ 
                success: true,
                message: "Login successful",
                data: responseData 
            });
        } catch (error) {
            next(error);
        }
    }

    public getPasskeys = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as any).session.staff_id;
            const passkeys = await this.passkeyService.getPasskeys(staffId);
            return res.status(200).json({ 
                success: true,
                message: "Fetched passkeys successfully.",
                data: passkeys 
            });
        } catch (error) {
            next(error);
        }
    }

    public updatePasskeyName = async (req: Request<{ id: string }, Record<string, never>, UpdatePasskeyNameRequestDto>, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as any).session.staff_id;
            const { id } = req.params;
            const { name } = req.body;
            const result = await this.passkeyService.updatePasskeyName(staffId, id, name);
            return res.status(200).json({
                success: true,
                message: "Updated passkey name successfully.",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    public deletePasskey = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as any).session.staff_id;
            const { id } = req.params;
            const result = await this.passkeyService.deletePasskey(staffId, id);
            return res.status(200).json({
                success: true,
                message: "Passkey revoked successfully.",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}