import { Request, Response } from "express";
import { DoctorService } from "./doctor.service";
import { CreateDoctorResponseDto } from "./doctor.dto";
import { WebSocketPublisher } from "websocket";

export class DoctorController {
    constructor(private readonly doctorService: DoctorService) {}

    public getAllDoctors = async (
        _req: Request,
        res: Response,
    ) => {
        const doctors = await this.doctorService.getAllDoctors();

        return res.status(200).json({
            message: "Fetched doctors successfully.",
            data: doctors,
        });
    };

    public getDoctorById = async (
        req: Request,
        res: Response,
    ) => {
        const staffId = Number(req.params.id);
        const doctor = await this.doctorService.getDoctorById(staffId);

        return res.status(200).json({
            message: "Fetched doctor successfully.",
            data: doctor,
        });
    };

    public createDoctor = async (
        req: Request,
        res: Response,
    ): Promise<Response<CreateDoctorResponseDto>> => {
        const doctor = await this.doctorService.createDoctor(req.body, req.auditContext);

        return res.status(201).json({
            message: "Doctor created successfully.",
            data: doctor as any,
        });
    };

    public updateDoctor = async (
        req: Request,
        res: Response,
    ) => {
        const staffId = Number(req.params.id);
        const doctor = await this.doctorService.updateDoctor(staffId, req.body, req.auditContext);

        return res.status(200).json({
            message: "Doctor updated successfully.",
            data: doctor,
        });
    };

    public getBasicDoctors = async(req: Request, res: Response) => {
        const doctors = await this.doctorService.getBasicDoctors();

        return res.status(200).json({
            message: "Fetched doctors",
            data: doctors,
        });
    };

    public getDoctorAvailability = async (req: Request, res: Response) => {
        const staffId = Number(req.params.id);
        const availability = await this.doctorService.getDoctorAvailability(staffId);
        
        return res.status(200).json({
            message: "Fetched doctor availability successfully.",
            data: availability,
        });
    };

    public getEffectiveSchedule = async (req: Request, res: Response) => {
        const staffId = Number(req.params.id);
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date || typeof start_date !== "string" || typeof end_date !== "string") {
            return res.status(400).json({
                message: "start_date and end_date query parameters are required and must be strings (YYYY-MM-DD).",
            });
        }

        const schedule = await this.doctorService.getEffectiveSchedule(staffId, start_date, end_date);
        
        return res.status(200).json({
            message: "Fetched effective schedule successfully.",
            data: schedule,
        });
    };
    
    public createDoctorAvailability = async (req: Request, res: Response) => {
        const staffId = Number(req.params.id);
        const slot = await this.doctorService.createDoctorAvailability(staffId, req.body);

        const actorStaffId = req.session?.staff_id;
        if (actorStaffId) WebSocketPublisher.scheduleUpdated(staffId, actorStaffId);

        return res.status(201).json({
            message: "Doctor availability created successfully.",
            data: slot,
        });
    };

    public updateDoctorAvailability = async (req: Request, res: Response) => {
        const slotId = Number(req.params.slotId);
        const slot = await this.doctorService.updateDoctorAvailability(slotId, req.body);

        const actorStaffId = req.session?.staff_id;
        if (actorStaffId) WebSocketPublisher.scheduleUpdated(slot.doctor_staff_id, actorStaffId);

        return res.status(200).json({
            message: "Doctor availability updated successfully.",
            data: slot,
        });
    };

    public deleteDoctorAvailability = async (req: Request, res: Response) => {
        const slotId = Number(req.params.slotId);
        const deleted = await this.doctorService.deleteDoctorAvailability(slotId);

        const actorStaffId = req.session?.staff_id;
        if (actorStaffId) WebSocketPublisher.scheduleUpdated(deleted.doctor_staff_id, actorStaffId);

        return res.status(200).json({
            message: "Doctor availability deleted successfully.",
        });
    };

    public getDoctorLeaves = async (req: Request, res: Response) => {
        const staffId = Number(req.params.id);
        const leaves = await this.doctorService.getDoctorLeaves(staffId);
        
        return res.status(200).json({
            message: "Fetched doctor leaves successfully.",
            data: leaves,
        });
    };
    
    public createDoctorLeave = async (req: Request, res: Response) => {
        const staffId = Number(req.params.id);
        const leave = await this.doctorService.createDoctorLeave(staffId, req.body);

        const actorStaffId = req.session?.staff_id;
        if (actorStaffId) WebSocketPublisher.scheduleUpdated(staffId, actorStaffId);

        return res.status(201).json({
            message: "Doctor leave created successfully.",
            data: leave,
        });
    };

    public updateDoctorLeave = async (req: Request, res: Response) => {
        const leaveId = Number(req.params.leaveId);
        const leave = await this.doctorService.updateDoctorLeave(leaveId, req.body);

        const actorStaffId = req.session?.staff_id;
        if (actorStaffId) WebSocketPublisher.scheduleUpdated(leave.doctor_staff_id, actorStaffId);

        return res.status(200).json({
            message: "Doctor leave updated successfully.",
            data: leave,
        });
    };

    public deleteDoctorLeave = async (req: Request, res: Response) => {
        const leaveId = Number(req.params.leaveId);
        const deleted = await this.doctorService.deleteDoctorLeave(leaveId);

        const actorStaffId = req.session?.staff_id;
        if (actorStaffId) WebSocketPublisher.scheduleUpdated(deleted.doctor_staff_id, actorStaffId);

        return res.status(200).json({
            message: "Doctor leave deleted successfully.",
        });
    };
}
