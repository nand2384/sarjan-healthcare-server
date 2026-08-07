import { Request, Response } from "express";
import { ReleaseNoteService } from "./release-note.service";
import { GetReleaseNotesFilters } from "./release-note.repository";
import { AppError, ErrorCode } from "@errors";

export class ReleaseNoteController {
    constructor(private readonly releaseNoteService: ReleaseNoteService) {}

    public create = async (req: Request, res: Response) => {
        const { version_label, title, body } = req.body;
        const staffId = req.session?.staff_id;

        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const note = await this.releaseNoteService.create(
            { version_label, title, body, created_by_staff_id: staffId },
            req.auditContext,
        );

        return res.status(201).json({
            success: true,
            message: "Release note published successfully.",
            data: note,
        });
    };

    public getReleaseNotes = async (req: Request, res: Response) => {
        const filters = req.query as unknown as GetReleaseNotesFilters;
        const result = await this.releaseNoteService.getReleaseNotes(filters);

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    };
}
