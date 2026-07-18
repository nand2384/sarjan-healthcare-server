import { Request, Response } from "express";
import { DoctorService } from "./doctor.service";
import { CreateDoctorResponseDto } from "./doctor.dto";

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
}
