import { Request, Response, NextFunction } from "express";
import { ReceptionistService } from "./receptionist.service";
import { AppError, ErrorCode } from "@errors";

export class ReceptionistController {
    constructor(private readonly receptionistService: ReceptionistService) {}

    public async getAllAppointments(req: Request, res: Response, next: NextFunction) {
        try {
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;
            
            const result = await this.receptionistService.getAllAppointments(startDate, endDate);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    public async getDashboardData(req: Request, res: Response) {
        const data = await this.receptionistService.getDashboardData();
        return res.status(200).json({
            success: true,
            message: "Dashboard data retrieved successfully",
            data
        });
    }


    public async getDoctorDashboardData(req: Request, res: Response) {
        const doctorId = parseInt(req.params.id as string);
        if (isNaN(doctorId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid doctor ID");
        }
        
        const data = await this.receptionistService.getDoctorDashboardData(doctorId);
        return res.status(200).json({
            success: true,
            message: "Doctor dashboard data retrieved successfully",
            data
        });
    }

    public async checkInPatient(req: Request, res: Response) {
        const appointmentId = parseInt(req.params.id as string);
        if (isNaN(appointmentId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid appointment ID");
        }

        // Get staff_id from session
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.receptionistService.checkInPatient(appointmentId, staffId);
        return res.status(200).json({
            success: true,
            message: "Patient checked in successfully",
            data
        });
    }

    public async updateAppointmentStatus(req: Request, res: Response) {
        const appointmentId = parseInt(req.params.id as string);
        if (isNaN(appointmentId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid appointment ID");
        }

        const { status } = req.body;
        if (!status) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Status is required");
        }

        const staffId = req.session?.staff_id;
        if(!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.receptionistService.updateAppointmentStatus(appointmentId, status, staffId);
        return res.status(200).json({
            success: true,
            message: "Appointment status updated successfully",
            data
        });
    }

    public async sendForTests(req: Request, res: Response) {
        const appointmentId = parseInt(req.params.id as string);
        if (isNaN(appointmentId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid appointment ID");
        }

        const { test_catalog_ids } = req.body;

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.receptionistService.sendForTests(appointmentId, test_catalog_ids, staffId);
        return res.status(200).json({
            success: true,
            message: "Patient sent for tests successfully",
            data
        });
    }

    public async getCheckoutInfo(req: Request, res: Response) {
        const appointmentId = parseInt(req.params.id as string);
        if (isNaN(appointmentId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid appointment ID");
        }

        const data = await this.receptionistService.getCheckoutInfo(appointmentId);
        return res.status(200).json({
            success: true,
            message: "Fetched checkout info successfully",
            data
        });
    }

    public async checkout(req: Request, res: Response) {
        const appointmentId = parseInt(req.params.id as string);
        if (isNaN(appointmentId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid appointment ID");
        }

        const { additional_test_catalog_ids, payment_method } = req.body;

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.receptionistService.checkout(
            appointmentId,
            staffId,
            additional_test_catalog_ids,
            payment_method,
            req.auditContext,
        );
        return res.status(200).json({
            success: true,
            message: "Checkout completed successfully",
            data
        });
    }
}
