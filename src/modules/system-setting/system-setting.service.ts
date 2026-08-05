import { RedisClientType } from "redis";
import { AuditAction, AuditEntityType } from "@generated/prisma/client";
import { SystemSettingRepository } from "./system-setting.repository";
import { CacheKeys } from "constants/cache.constants";
import { SystemSettingDefaults, SystemSettingKeyValue } from "constants/system-setting.constants";
import { AuditService } from "@modules/audit/audit.service";
import { AppError, ErrorCode } from "@errors";
import { logger } from "@logger";

export class SystemSettingService {
    constructor(
        private readonly systemSettingRepository: SystemSettingRepository,
        private readonly redisClient: RedisClientType,
        private readonly auditService: AuditService,
    ) {}

    /** Cached read, source of truth is Postgres. Falls back to the key's known default if never set. */
    public async getNumber(key: SystemSettingKeyValue): Promise<number> {
        const cacheKey = CacheKeys.systemSetting(key);

        try {
            const cached = await this.redisClient.get(cacheKey);
            if (cached !== null) return Number(cached);
        } catch (error) {
            logger.warn(error, `Error fetching system setting ${key} from redis`);
        }

        const row = await this.systemSettingRepository.findByKey(key);
        const value = row ? Number(row.setting_value) : SystemSettingDefaults[key];

        try {
            await this.redisClient.set(cacheKey, String(value));
        } catch (error) {
            logger.warn(error, `Error caching system setting ${key} in redis`);
        }

        return value;
    }

    public async getRaw(key: SystemSettingKeyValue) {
        const row = await this.systemSettingRepository.findByKey(key);
        return {
            setting_key: key,
            setting_value: row?.setting_value ?? String(SystemSettingDefaults[key]),
        };
    }

    public async updateSetting(
        key: SystemSettingKeyValue,
        value: number,
        auditContext: { performed_by_staff_id: number; ip_address?: string; user_agent?: string },
    ) {
        if (!Number.isInteger(value) || value <= 0) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Setting value must be a positive integer");
        }

        const previous = await this.systemSettingRepository.findByKey(key);
        const result = await this.systemSettingRepository.upsert(key, String(value));

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.SYSTEM_SETTING,
            entity_id: key,
            action: AuditAction.UPDATE,
            old_values: { setting_value: previous?.setting_value ?? String(SystemSettingDefaults[key]) },
            new_values: { setting_value: result.setting_value },
        });

        try {
            await this.redisClient.del(CacheKeys.systemSetting(key));
        } catch (error) {
            logger.error(error, `Failed to invalidate system setting cache for ${key}`);
        }

        return result;
    }
}
