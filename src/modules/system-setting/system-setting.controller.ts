import { Request, Response } from "express";
import { SystemSettingService } from "./system-setting.service";
import { SystemSettingKeyValue } from "constants/system-setting.constants";
import { AppError, ErrorCode } from "@errors";

export class SystemSettingController {
    constructor(private readonly systemSettingService: SystemSettingService) {}

    public getSetting = async (req: Request, res: Response) => {
        const key = req.params.key as SystemSettingKeyValue;
        const data = await this.systemSettingService.getRaw(key);

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public updateSetting = async (req: Request, res: Response) => {
        const key = req.params.key as SystemSettingKeyValue;
        const { value } = req.body;

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const result = await this.systemSettingService.updateSetting(key, value, {
            performed_by_staff_id: staffId,
            ip_address: req.ip,
            user_agent: req.get("user-agent"),
        });

        return res.status(200).json({
            success: true,
            message: "Setting updated successfully",
            data: result,
        });
    };
}
