import { Request, Response } from "express";
import { CatalogService } from "./catalog.service";
import { CatalogMapper } from "./catalog.mapper";
import { AppError, ErrorCode } from "@errors";
import { USER_ROLE } from "common/common.schema";
import { CatalogItemType } from "@generated/prisma/client";

function isLeadOrAdmin(req: Request): boolean {
    const roles = req.session?.roles ?? [];
    return roles.includes(USER_ROLE.ADMIN) || roles.includes(USER_ROLE.LEAD_DOCTOR);
}

export class CatalogController {
    constructor(private readonly catalogService: CatalogService) {}

    public getSuggestions = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");

        const type = req.query.type as CatalogItemType;
        const items = await this.catalogService.getSuggestions(type, staffId);
        return res.status(200).json({
            success: true,
            data: items.map(CatalogMapper.toDto),
        });
    };

    public addItem = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");

        const item = await this.catalogService.addItem(req.body, staffId, isLeadOrAdmin(req));
        return res.status(201).json({
            success: true,
            message: "Catalog item added.",
            data: CatalogMapper.toDto(item),
        });
    };

    public updateItem = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        const catalogItemId = parseInt(req.params.id as string);
        if (isNaN(catalogItemId)) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid catalog item ID");

        const item = await this.catalogService.updateItem(catalogItemId, req.body, staffId, isLeadOrAdmin(req));
        return res.status(200).json({
            success: true,
            message: "Catalog item updated.",
            data: CatalogMapper.toDto(item),
        });
    };

    public deleteItem = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        const catalogItemId = parseInt(req.params.id as string);
        if (isNaN(catalogItemId)) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid catalog item ID");

        await this.catalogService.deleteItem(catalogItemId, staffId, isLeadOrAdmin(req));
        return res.status(200).json({ success: true, message: "Catalog item removed." });
    };

    public dismiss = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        const catalogItemId = parseInt(req.params.id as string);
        if (isNaN(catalogItemId)) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid catalog item ID");

        await this.catalogService.dismissDefault(catalogItemId, staffId);
        return res.status(200).json({ success: true, message: "Hidden from your list." });
    };

    public undismiss = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        const catalogItemId = parseInt(req.params.id as string);
        if (isNaN(catalogItemId)) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid catalog item ID");

        await this.catalogService.undismissDefault(catalogItemId, staffId);
        return res.status(200).json({ success: true, message: "Restored to your list." });
    };
}
