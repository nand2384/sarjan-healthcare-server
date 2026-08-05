export const CacheKeys = {
    MASTER: "master",
    systemSetting: (key: string) => `system_setting:${key}`,
} as const;