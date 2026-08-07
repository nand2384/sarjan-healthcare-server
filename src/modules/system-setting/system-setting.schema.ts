import { z } from "zod";
import { SystemSettingKey, SystemSettingKeyValue } from "constants/system-setting.constants";

// Derived from SystemSettingKey rather than hardcoded — a hardcoded list here
// previously went stale the moment new keys (FAILED_LOGIN_MAX_ATTEMPTS etc.)
// were added to SystemSettingKey without updating this schema, 400ing every
// request for them.
const systemSettingKeyValues = Object.values(SystemSettingKey) as [SystemSettingKeyValue, ...SystemSettingKeyValue[]];

export const systemSettingKeyParamSchema = z.object({
    key: z.enum(systemSettingKeyValues),
});

export const updateSystemSettingSchema = z.object({
    value: z.number().int().positive("Value must be a positive integer"),
});
