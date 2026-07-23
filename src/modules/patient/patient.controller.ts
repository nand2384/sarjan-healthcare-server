import { Request, Response, NextFunction } from "express";
import { PatientService } from "./patient.service";
import { RegisterAndBookRequestDto } from "./patient.dtos";
import { AppError, ErrorCode } from "@errors";

export class PatientController {
    constructor(private readonly patientService: PatientService) {}

    private validatePhones(payload: any) {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (payload.mobile_number && !e164Regex.test(payload.mobile_number)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid mobile_number. Must be in E.164 format (e.g. +919876543210).");
        }
        if (payload.whatsapp_number && !e164Regex.test(payload.whatsapp_number)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid whatsapp_number. Must be in E.164 format (e.g. +919876543210).");
        }
    }

    public async registerAndBook(req: Request, res: Response): Promise<void> {
        const payload: RegisterAndBookRequestDto = req.body;
        this.validatePhones(payload);
        
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const result = await this.patientService.registerAndBook(payload, staffId);
        
        res.status(201).json({
            message: "Patient registered and appointment booked successfully",
            data: result,
        });
    }

    public async registerWalkIn(req: Request, res: Response): Promise<void> {
        const payload = req.body;
        this.validatePhones(payload);

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const result = await this.patientService.registerWalkIn(payload, staffId);
        
        res.status(201).json({
            message: "Walk-in patient registered successfully",
            data: result,
        });
    }

    public async updateProfile(req: Request, res: Response): Promise<void> {
        const patientId = parseInt(req.params.id as string);
        if (isNaN(patientId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid patient ID");
        }

        const payload = req.body;
        this.validatePhones(payload);

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const result = await this.patientService.updatePatientProfile(patientId, payload);

        res.status(200).json({
            message: "Patient profile updated successfully",
            data: result,
        });
    }

    public async searchPatients(req: Request, res: Response, next: NextFunction) {
        try {
            const query = (req.query.q as string) || '';
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const response = await this.patientService.searchPatients(query, page, limit);

            res.status(200).json({
                success: true,
                data: response
            });
        } catch (error) {
            next(error);
        }
    }

    public async bookAppointment(req: Request, res: Response, next: NextFunction) {
        try {
            const patientId = parseInt(req.params.id as string);
            if (isNaN(patientId)) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid patient ID");
            }

            const payload = req.body;
            const staffId = req.session?.staff_id;
            if (!staffId) {
                throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
            }

            const result = await this.patientService.bookAppointment(patientId, payload, staffId);

            res.status(201).json({
                message: "Appointment booked successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}
