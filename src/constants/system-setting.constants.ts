export const SystemSettingKey = {
    APPOINTMENT_REMINDER_HOURS_BEFORE: "APPOINTMENT_REMINDER_HOURS_BEFORE",
    WALK_IN_PRIORITY_THRESHOLD: "WALK_IN_PRIORITY_THRESHOLD",
} as const;

export type SystemSettingKeyValue = (typeof SystemSettingKey)[keyof typeof SystemSettingKey];

export const SystemSettingDefaults: Record<SystemSettingKeyValue, number> = {
    [SystemSettingKey.APPOINTMENT_REMINDER_HOURS_BEFORE]: 1,
    [SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD]: 3,
};
