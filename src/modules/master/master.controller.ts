import { Request, Response } from "express";

import { MasterService } from "./master.service";

import { GetMastersResponseDto } from "./master.dto";

export class MasterController {
    constructor(
        private readonly masterService: MasterService,
    ) {}

    public async getMasters(
        _req: Request,
        res: Response<GetMastersResponseDto>,
    ): Promise<Response<GetMastersResponseDto>> {
        const data = await this.masterService.getMasters();

        return res.status(200).json(data);
    }

    // --- Admin Endpoints ---

    public getAllAdminMasters = async (
        _req: Request,
        res: Response,
    ) => {
        const data = await this.masterService.getAllAdminMasters();
        return res.status(200).json(data);
    };

    public getAllAdminRoles = async (
        _req: Request,
        res: Response,
    ) => {
        const data = await this.masterService.getAllAdminRoles();
        return res.status(200).json(data);
    };

    // --- Main Master CRUD ---

    public createMainMaster = async (
        req: Request,
        res: Response,
    ) => {
        const data = await this.masterService.createMainMaster(req.body, req.auditContext);
        return res.status(201).json(data);
    };

    public updateMainMaster = async (
        req: Request,
        res: Response,
    ) => {
        const id = Number(req.params.id);
        const data = await this.masterService.updateMainMaster(id, req.body, req.auditContext);
        return res.status(200).json(data);
    };

    public deleteMainMaster = async (
        req: Request,
        res: Response,
    ) => {
        const id = Number(req.params.id);
        await this.masterService.deleteMainMaster(id, req.auditContext);
        return res.status(200).json({ success: true, message: "Main Master deleted successfully" });
    };

    // --- Value Master CRUD ---

    public createValueMaster = async (
        req: Request,
        res: Response,
    ) => {
        const data = await this.masterService.createValueMaster(req.body, req.auditContext);
        return res.status(201).json(data);
    };

    public updateValueMaster = async (
        req: Request,
        res: Response,
    ) => {
        const valueId = Number(req.params.valueId);
        const data = await this.masterService.updateValueMaster(valueId, req.body, req.auditContext);
        return res.status(200).json(data);
    };

    public deleteValueMaster = async (
        req: Request,
        res: Response,
    ) => {
        const valueId = Number(req.params.valueId);
        await this.masterService.deleteValueMaster(valueId, req.auditContext);
        return res.status(200).json({ success: true, message: "Value Master deleted successfully" });
    };

    // --- Role CRUD ---

    public createRole = async (
        req: Request,
        res: Response,
    ) => {
        const data = await this.masterService.createRole(req.body, req.auditContext);
        return res.status(201).json(data);
    };

    public updateRole = async (
        req: Request,
        res: Response,
    ) => {
        const id = Number(req.params.id);
        const data = await this.masterService.updateRole(id, req.body, req.auditContext);
        return res.status(200).json(data);
    };

    public deleteRole = async (
        req: Request,
        res: Response,
    ) => {
        const id = Number(req.params.id);
        await this.masterService.deleteRole(id, req.auditContext);
        return res.status(200).json({ success: true, message: "Role deleted successfully" });
    };
}