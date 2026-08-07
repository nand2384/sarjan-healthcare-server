export const SystemSettingKey = {
    APPOINTMENT_REMINDER_HOURS_BEFORE: "APPOINTMENT_REMINDER_HOURS_BEFORE",
    WALK_IN_PRIORITY_THRESHOLD: "WALK_IN_PRIORITY_THRESHOLD",
    FAILED_LOGIN_MAX_ATTEMPTS: "FAILED_LOGIN_MAX_ATTEMPTS",
    FAILED_LOGIN_WINDOW_MINUTES: "FAILED_LOGIN_WINDOW_MINUTES",
    LOCKOUT_DURATION_MINUTES: "LOCKOUT_DURATION_MINUTES",
} as const;

export type SystemSettingKeyValue = (typeof SystemSettingKey)[keyof typeof SystemSettingKey];

export const SystemSettingDefaults: Record<SystemSettingKeyValue, number> = {
    [SystemSettingKey.APPOINTMENT_REMINDER_HOURS_BEFORE]: 1,
    [SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD]: 3,
    [SystemSettingKey.FAILED_LOGIN_MAX_ATTEMPTS]: 10,
    [SystemSettingKey.FAILED_LOGIN_WINDOW_MINUTES]: 15,
    [SystemSettingKey.LOCKOUT_DURATION_MINUTES]: 30,
};

// Separate boolean-valued key set — SystemSettingDefaults above is numeric-only
// (getNumber/updateSetting validate positive integers), so boolean-flavored
// settings get their own small parallel map rather than overloading that type.
export const SystemSettingBooleanKey = {
    MAINTENANCE_MODE_ENABLED: "MAINTENANCE_MODE_ENABLED",
} as const;

export type SystemSettingBooleanKeyValue = (typeof SystemSettingBooleanKey)[keyof typeof SystemSettingBooleanKey];

export const SystemSettingBooleanDefaults: Record<SystemSettingBooleanKeyValue, boolean> = {
    [SystemSettingBooleanKey.MAINTENANCE_MODE_ENABLED]: false,
};
