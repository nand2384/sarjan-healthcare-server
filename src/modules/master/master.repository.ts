import { PrismaClient, Prisma } from "@generated/prisma/client";
import { 
    CreateMainMasterDto, 
    UpdateMainMasterDto, 
    CreateValueMasterDto, 
    UpdateValueMasterDto, 
    CreateRoleMasterDto, 
    UpdateRoleMasterDto 
} from "./master.dto";

export class MasterRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getMasters(
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx ?? this.prisma;

        return prisma.mainMaster.findMany({
            where: {
                is_active: true,
                deleted_at: null,
            },
            select: {
                master_name: true,
                values: {
                    where: {
                        is_active: true,
                        deleted_at: null,
                    },
                    orderBy: {
                        display_order: "asc",
                    },
                    select: {
                        value_id: true,
                        value_name: true,
                    },
                },
            },
            orderBy: {
                display_order: "asc",
            },
        });
    }

    public async getRoles(
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx ?? this.prisma;

        return prisma.roleMaster.findMany({
            where: {
                is_active: true,
                deleted_at: null,
            },
            orderBy: {
                display_order: "asc",
            },
            select: {
                role_id: true,
                role_name: true,
            },
        });
    }

    public async getRolesByIds(
        roleIds: number[],
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx ?? this.prisma;

        return prisma.roleMaster.findMany({
            where: {
                role_id: {
                    in: roleIds,
                },
                is_active: true,
                deleted_at: null,
            },
            select: {
                role_id: true,
                role_name: true,
            },
        });
    }

    // --- Admin Endpoints (Include inactive) ---

    public async getAllAdminMasters(
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx ?? this.prisma;

        return prisma.mainMaster.findMany({
            where: { deleted_at: null },
            include: {
                values: {
                    where: { deleted_at: null },
                    orderBy: { display_order: "asc" }
                }
            },
            orderBy: { display_order: "asc" }
        });
    }

    public async getAllAdminRoles(
        tx?: Prisma.TransactionClient,
    ) {
        const prisma = tx ?? this.prisma;

        return prisma.roleMaster.findMany({
            where: { deleted_at: null },
            orderBy: { display_order: "asc" }
        });
    }

    // --- CRUD MainMaster ---

    public async createMainMaster(data: CreateMainMasterDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        
        const count = await prisma.mainMaster.count();

        return prisma.mainMaster.create({
            data: {
                master_name: data.master_name,
                description: data.description,
                is_active: data.is_active ?? true,
                display_order: count + 1,
            }
        });
    }

    public async getMainMasterById(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.mainMaster.findUnique({
            where: { master_id: id, deleted_at: null }
        });
    }

    public async updateMainMaster(id: number, data: UpdateMainMasterDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.mainMaster.update({
            where: { master_id: id },
            data: {
                ...data
            }
        });
    }

    public async deleteMainMaster(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.mainMaster.update({
            where: { master_id: id },
            data: { deleted_at: new Date() }
        });
    }

    // --- CRUD ValueMaster ---

    public async createValueMaster(data: CreateValueMasterDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        
        const count = await prisma.valueMaster.count({
            where: { master_id: data.master_id }
        });

        return prisma.valueMaster.create({
            data: {
                master_id: data.master_id,
                value_name: data.value_name,
                description: data.description,
                is_active: data.is_active ?? true,
                display_order: count + 1,
            }
        });
    }

    public async getValueMasterById(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.valueMaster.findUnique({
            where: { value_id: id, deleted_at: null }
        });
    }

    public async updateValueMaster(id: number, data: UpdateValueMasterDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.valueMaster.update({
            where: { value_id: id },
            data: {
                ...data
            }
        });
    }

    public async deleteValueMaster(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.valueMaster.update({
            where: { value_id: id },
            data: { deleted_at: new Date() }
        });
    }

    // --- CRUD RoleMaster ---

    public async createRole(data: CreateRoleMasterDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        
        const count = await prisma.roleMaster.count();

        return prisma.roleMaster.create({
            data: {
                role_name: data.role_name,
                description: data.description,
                is_active: data.is_active ?? true,
                display_order: count + 1,
            }
        });
    }

    public async getRoleById(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.roleMaster.findUnique({
            where: { role_id: id, deleted_at: null }
        });
    }

    public async updateRole(id: number, data: UpdateRoleMasterDto, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.roleMaster.update({
            where: { role_id: id },
            data: {
                ...data
            }
        });
    }

    public async deleteRole(id: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.roleMaster.update({
            where: { role_id: id },
            data: { deleted_at: new Date() }
        });
    }
}