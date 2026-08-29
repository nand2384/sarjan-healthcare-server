import { Request, Response } from "express";
import { ConsultationService } from "./consultation.service";
import { ConsultationMapper } from "./consultation.mapper";
import { AppError, ErrorCode } from "@errors";
import { USER_ROLE } from "common/common.schema";

export class ConsultationController {
    constructor(private readonly consultationService: ConsultationService) {}

    public createConsultation = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");

        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN);
        const restrictToDoctorStaffId = isPrivileged ? undefined : staffId;

        const consultation = await this.consultationService.createConsultation(req.body, staffId, restrictToDoctorStaffId);
        return res.status(201).json({
            success: true,
            message: "Consultation recorded.",
            data: ConsultationMapper.toDto(consultation),
        });
    };

    public getPatientHistory = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        const patientId = parseInt(req.params.patientId as string);
        if (isNaN(patientId)) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid patient ID");

        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN);

        const history = await this.consultationService.getPatientHistory(patientId, staffId, isPrivileged);
        return res.status(200).json({
            success: true,
            data: history.map(ConsultationMapper.toDto),
        });
    };

    public getPatientsMine = async (req: Request, res: Response) => {
        const doctorId = parseInt(req.params.id as string);
        if (isNaN(doctorId)) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid doctor ID");

        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN);
        if (!isPrivileged && doctorId !== req.session?.staff_id) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "You can only view your own patients.");
        }

        const patients = await this.consultationService.getPatientsMine(doctorId);
        return res.status(200).json({
            success: true,
            data: patients.map((p) => ({
                patient_id: p.patient.patient_id,
                uhid: p.patient.uhid,
                name: `${p.patient.first_name} ${p.patient.last_name}`,
                mobile_number: p.patient.mobile_number,
                age: p.patient.age,
                gender: p.patient.gender?.value_name ?? null,
                relationship: p.relationship,
                last_visit: p.lastVisit ? p.lastVisit.toISOString() : null,
                visit_count: p.visitCount,
                allergies: p.allergies,
                diagnoses: p.diagnoses,
            })),
        });
    };
}
