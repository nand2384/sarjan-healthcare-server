import { Request, Response } from "express";
import { LabService } from "./lab.service";
import { LabMapper } from "./lab.mapper";
import { AppError, ErrorCode } from "@errors";
import { USER_ROLE } from "common/common.schema";

export class LabController {
    constructor(private readonly labService: LabService) {}

    public getForDoctor = async (req: Request, res: Response) => {
        const doctorId = parseInt(req.params.id as string);
        if (isNaN(doctorId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid doctor ID");
        }

        // Same self-service pattern as the doctor dashboard/schedule routes —
        // a DOCTOR-only caller may only view their own results.
        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN) || roles.includes(USER_ROLE.RECEPTIONIST);
        if (!isPrivileged && doctorId !== req.session?.staff_id) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "You can only view your own lab results.");
        }

        const onlyPending = req.query.status === "pending";
        const orders = await this.labService.getForDoctor(doctorId, onlyPending);
        return res.status(200).json({
            success: true,
            data: orders.map(LabMapper.toDto),
        });
    };

    public enterResult = async (req: Request, res: Response) => {
        const testOrderId = parseInt(req.params.id as string);
        if (isNaN(testOrderId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid test order ID");
        }

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const roles = req.session?.roles ?? [];
        const isPrivileged = roles.includes(USER_ROLE.ADMIN) || roles.includes(USER_ROLE.RECEPTIONIST);
        const restrictToDoctorStaffId = isPrivileged ? undefined : staffId;

        const order = await this.labService.enterResult(testOrderId, req.body, staffId, restrictToDoctorStaffId);
        return res.status(200).json({
            success: true,
            message: "Result recorded.",
            data: LabMapper.toDto(order),
        });
    };
}
