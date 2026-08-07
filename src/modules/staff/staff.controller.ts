import { Request, Response } from "express";

import { StaffService } from "./staff.service";
import { CreateStaffResponseDto, DisableStaffResponseDto, GetAllStaffResponseDto } from "./staff.dto";

export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    public createStaff = async (
        req: Request,
        res: Response,
    ): Promise<Response<CreateStaffResponseDto>> => {
        const staff = await this.staffService.createStaff(req.body, req.auditContext);

        return res.status(201).json({
            message: "Staff created successfully.",
            data: staff,
        });
    };

    public getAllStaff = async (
        req: Request,
        res: Response<GetAllStaffResponseDto>,
    ): Promise<Response<GetAllStaffResponseDto>> => {
        const page = req.query.page ? Number(req.query.page) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const { data, total, page: returnedPage, limit: returnedLimit } = await this.staffService.getAllStaff(page, limit);

        return res.status(200).json({
            message: "Fetched staff successfully.",
            data,
            total,
            page: returnedPage,
            limit: returnedLimit,
        });
    };

    public getStaffById = async (
        req: Request,
        res: Response,
    ) => {
        const staffId = Number(req.params.id);
        const staff = await this.staffService.getStaffById(staffId);

        return res.status(200).json({
            message: "Fetched staff successfully.",
            data: staff,
        });
    };

    public updateStaff = async (
        req: Request,
        res: Response,
    ) => {
        const staffId = Number(req.params.id);
        const staff = await this.staffService.updateStaff(staffId, req.body, req.auditContext);

        return res.status(200).json({
            message: "Staff updated successfully.",
            data: staff,
        });
    };

    public updateStaffRoles = async (
        req: Request,
        res: Response,
    ) => {
        const staffId = Number(req.params.id);
        const { roles } = req.body;
        const staff = await this.staffService.updateStaffRoles(staffId, roles, req.auditContext);

        return res.status(200).json({
            message: "Roles updated successfully.",
            data: staff,
        });
    };

    public disableStaff = async(
        req: Request,
        res: Response
    ): Promise<Response<DisableStaffResponseDto>> => {
        const staffId = Number(req.params.id);
        const staff = await this.staffService.disableStaff(staffId, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Staff disabled successfully.",
            data: staff,
        });
    }

    public restoreStaff = async(
        req: Request,
        res: Response
    ): Promise<Response<DisableStaffResponseDto>> => {
        const staffId = Number(req.params.id);
        const staff = await this.staffService.restoreStaff(staffId, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Staff access restored successfully.",
            data: staff,
        });
    }

    public unlockStaff = async(
        req: Request,
        res: Response
    ): Promise<Response<DisableStaffResponseDto>> => {
        const staffId = Number(req.params.id);
        const staff = await this.staffService.unlockStaff(staffId, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Staff account unlocked successfully.",
            data: staff,
        });
    }

    public deleteStaff = async (
        req: Request,
        res: Response,
    ):Promise<Response<{ success: boolean, message: string }>> => {
        const staffId = Number(req.params.id);
        await this.staffService.deleteStaff(staffId, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Staff deleted",
        });
    }

    public bulkDisableStaff = async (
        req: Request,
        res: Response,
    ) => {
        const { staffIds } = req.body;
        await this.staffService.bulkDisableStaff(staffIds, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Selected staff members disabled successfully.",
        });
    }

    public bulkDeleteStaff = async (
        req: Request,
        res: Response,
    ) => {
        const { staffIds } = req.body;
        await this.staffService.bulkDeleteStaff(staffIds, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Selected staff members deleted successfully.",
        });
    }

    public triggerPasswordReset = async (
        req: Request,
        res: Response,
    ) => {
        const staffId = Number(req.params.id);
        await this.staffService.triggerPasswordReset(staffId, req.auditContext);

        return res.status(200).json({
            success: true,
            message: "Password reset email sent successfully.",
        });
    }
}
