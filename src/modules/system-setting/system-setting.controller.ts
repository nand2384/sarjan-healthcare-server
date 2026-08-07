import { Request, Response } from "express";
import { SystemSettingService } from "./system-setting.service";
import { SystemSettingKeyValue, SystemSettingBooleanKey } from "constants/system-setting.constants";
import { AppError, ErrorCode } from "@errors";
import { WebSocketPublisher } from "websocket";

export class SystemSettingController {
    constructor(private readonly systemSettingService: SystemSettingService) {}

    public getMaintenanceMode = async (_req: Request, res: Response) => {
        const enabled = await this.systemSettingService.getBoolean(SystemSettingBooleanKey.MAINTENANCE_MODE_ENABLED);

        return res.status(200).json({
            success: true,
            data: { enabled },
        });
    };

    public updateMaintenanceMode = async (req: Request, res: Response) => {
        const { enabled } = req.body as { enabled: boolean };

        await this.systemSettingService.updateBooleanSetting(SystemSettingBooleanKey.MAINTENANCE_MODE_ENABLED, enabled, req.auditContext);

        WebSocketPublisher.maintenanceModeChanged(enabled);

        return res.status(200).json({
            success: true,
            message: `Maintenance mode ${enabled ? "enabled" : "disabled"}.`,
            data: { enabled },
        });
    };

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
