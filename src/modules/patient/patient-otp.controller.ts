import { Request, Response, NextFunction } from "express";
import { PatientOtpService } from "./patient-otp.service";

export class PatientOtpController {
    constructor(private readonly patientOtpService: PatientOtpService) {}

    public async send(req: Request, res: Response, next: NextFunction) {
        try {
            const { whatsapp_number } = req.body;
            const result = await this.patientOtpService.sendOtp(whatsapp_number);

            res.status(200).json({
                message: "OTP sent successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    public async verify(req: Request, res: Response, next: NextFunction) {
        try {
            const { whatsapp_number, code } = req.body;
            const result = await this.patientOtpService.verifyOtp(whatsapp_number, code);

            res.status(200).json({
                message: "WhatsApp number verified successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}
