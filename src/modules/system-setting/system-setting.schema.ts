import { z } from "zod";
import { SystemSettingKey } from "constants/system-setting.constants";

export const systemSettingKeyParamSchema = z.object({
    key: z.enum([
        SystemSettingKey.APPOINTMENT_REMINDER_HOURS_BEFORE,
        SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD,
    ]),
});

export const updateSystemSettingSchema = z.object({
    value: z.number().int().positive("Value must be a positive integer"),
});
