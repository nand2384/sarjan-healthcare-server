import { Request, Response } from "express";
import { ClinicProfileService } from "./clinic-profile.service";

export class ClinicProfileController {
    constructor(private readonly clinicProfileService: ClinicProfileService) {}

    public get = async (_req: Request, res: Response) => {
        const profile = await this.clinicProfileService.get();
        return res.status(200).json({ success: true, data: profile });
    };

    public update = async (req: Request, res: Response) => {
        const profile = await this.clinicProfileService.update(req.body);
        return res.status(200).json({ success: true, message: "Clinic profile updated.", data: profile });
    };

    public getPublic = async (_req: Request, res: Response) => {
        const profile = await this.clinicProfileService.getPublic();
        return res.status(200).json({ success: true, data: profile });
    };
}
