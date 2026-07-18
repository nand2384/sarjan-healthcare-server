import { RedisClientType } from "redis";
import { GetMastersResponseDto, CreateMainMasterDto, UpdateMainMasterDto, CreateValueMasterDto, UpdateValueMasterDto, CreateRoleMasterDto, UpdateRoleMasterDto } from "./master.dto";
import { MasterRepository } from "./master.repository";
import { CacheKeys } from "constants/cache.constants";
import { MasterNames } from "constants/master.constants";
import { logger } from "@logger";
import { AuditService } from "@modules/audit/audit.service";
import { AuditAction, AuditEntityType, Prisma } from "@generated/prisma/client";

export class MasterService {
    constructor(
        private readonly masterRepository: MasterRepository,
        private readonly redisClient: RedisClientType,
        private readonly auditService: AuditService,
    ) {}

    public async getMasters(): Promise<GetMastersResponseDto> {
        let cached = null;
        try {
            cached = await this.redisClient.get(CacheKeys.MASTER);
        } catch (error) {
            logger.warn(error, "Error fetching master from redis");
        }
        
        if(cached) {
            return JSON.parse(cached) as GetMastersResponseDto;
        }

        const [masters, roles] = await Promise.all([
            this.masterRepository.getMasters(),
            this.masterRepository.getRoles(),
        ]);

        const response: GetMastersResponseDto = {
            genders: [],
            roles: roles.map((role) => ({
                role_id: role.role_id,
                role_name: role.role_name,
            })),
        };

        for (const master of masters) {
            switch (master.master_name) {
                case MasterNames.GENDER:
                    response.genders = master.values.map((value) => ({
                        value_id: value.value_id,
                        value_name: value.value_name,
                    }));
                    break;
            }
        }

        await this.redisClient.set(
             CacheKeys.MASTER,
            JSON.stringify(response),
        );

        return response;
    }

    private async invalidateCache() {
        try {
            await this.redisClient.del(CacheKeys.MASTER);
        } catch (error) {
            logger.error(error, "Failed to invalidate master cache");
        }
    }

    // --- Admin Endpoints ---

    public async getAllAdminMasters() {
        return this.masterRepository.getAllAdminMasters();
    }

    public async getAllAdminRoles() {
        return this.masterRepository.getAllAdminRoles();
    }

    // --- Main Master CRUD ---

    public async createMainMaster(data: CreateMainMasterDto, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const result = await this.masterRepository.createMainMaster(data);
        
        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.MASTER_DATA,
            entity_id: `MAIN_${result.master_id}`,
            action: AuditAction.CREATE,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    public async updateMainMaster(id: number, data: UpdateMainMasterDto, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const oldMaster = await this.masterRepository.getMainMasterById(id);
        if (!oldMaster) throw new Error("Main Master not found");

        const result = await this.masterRepository.updateMainMaster(id, data);

        let action: AuditAction = AuditAction.UPDATE;
        if (data.is_active === true && oldMaster.is_active === false) action = AuditAction.ENABLE;
        else if (data.is_active === false && oldMaster.is_active === true) action = AuditAction.DISABLE;

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.MASTER_DATA,
            entity_id: `MAIN_${result.master_id}`,
            action: action,
            old_values: oldMaster as unknown as Prisma.InputJsonValue,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    public async deleteMainMaster(id: number, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const oldMaster = await this.masterRepository.getMainMasterById(id);
        if (!oldMaster) throw new Error("Main Master not found");

        const result = await this.masterRepository.deleteMainMaster(id);

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.MASTER_DATA,
            entity_id: `MAIN_${result.master_id}`,
            action: AuditAction.DELETE,
            old_values: oldMaster as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    // --- Value Master CRUD ---

    public async createValueMaster(data: CreateValueMasterDto, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const result = await this.masterRepository.createValueMaster(data);
        
        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.MASTER_DATA,
            entity_id: `VALUE_${result.value_id}`,
            action: AuditAction.CREATE,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    public async updateValueMaster(id: number, data: UpdateValueMasterDto, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const oldValue = await this.masterRepository.getValueMasterById(id);
        if (!oldValue) throw new Error("Value Master not found");

        const result = await this.masterRepository.updateValueMaster(id, data);

        let action: AuditAction = AuditAction.UPDATE;
        if (data.is_active === true && oldValue.is_active === false) action = AuditAction.ENABLE;
        else if (data.is_active === false && oldValue.is_active === true) action = AuditAction.DISABLE;

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.MASTER_DATA,
            entity_id: `VALUE_${result.value_id}`,
            action: action,
            old_values: oldValue as unknown as Prisma.InputJsonValue,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    public async deleteValueMaster(id: number, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const oldValue = await this.masterRepository.getValueMasterById(id);
        if (!oldValue) throw new Error("Value Master not found");

        const result = await this.masterRepository.deleteValueMaster(id);

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.MASTER_DATA,
            entity_id: `VALUE_${result.value_id}`,
            action: AuditAction.DELETE,
            old_values: oldValue as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    // --- Role CRUD ---

    public async createRole(data: CreateRoleMasterDto, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const result = await this.masterRepository.createRole(data);
        
        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.ROLE,
            entity_id: `${result.role_id}`,
            action: AuditAction.CREATE,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    public async updateRole(id: number, data: UpdateRoleMasterDto, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const oldRole = await this.masterRepository.getRoleById(id);
        if (!oldRole) throw new Error("Role not found");

        const result = await this.masterRepository.updateRole(id, data);

        let action: AuditAction = AuditAction.UPDATE;
        if (data.is_active === true && oldRole.is_active === false) action = AuditAction.ENABLE;
        else if (data.is_active === false && oldRole.is_active === true) action = AuditAction.DISABLE;

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.ROLE,
            entity_id: `${result.role_id}`,
            action: action,
            old_values: oldRole as unknown as Prisma.InputJsonValue,
            new_values: result as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }

    public async deleteRole(id: number, auditContext: { performed_by_staff_id: number, ip_address?: string, user_agent?: string }) {
        const oldRole = await this.masterRepository.getRoleById(id);
        if (!oldRole) throw new Error("Role not found");

        const result = await this.masterRepository.deleteRole(id);

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.ROLE,
            entity_id: `${result.role_id}`,
            action: AuditAction.DELETE,
            old_values: oldRole as unknown as Prisma.InputJsonValue,
        });

        await this.invalidateCache();
        return result;
    }
}