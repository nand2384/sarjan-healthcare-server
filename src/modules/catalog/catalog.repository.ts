import { Prisma, PrismaClient, CatalogItemType } from "@generated/prisma/client";

export class CatalogRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async findMergedSuggestions(type: CatalogItemType, doctorStaffId: number) {
        const [personal, defaults, dismissals] = await Promise.all([
            this.prisma.doctorCatalogItem.findMany({
                where: { type, doctor_staff_id: doctorStaffId, is_active: true },
            }),
            this.prisma.doctorCatalogItem.findMany({
                where: { type, doctor_staff_id: null, is_active: true },
            }),
            this.prisma.catalogItemDismissal.findMany({
                where: { doctor_staff_id: doctorStaffId },
                select: { catalog_item_id: true },
            }),
        ]);
        const dismissedIds = new Set(dismissals.map((d) => d.catalog_item_id));
        return { personal, defaults: defaults.filter((d) => !dismissedIds.has(d.catalog_item_id)) };
    }

    public async findByNormalizedValue(type: CatalogItemType, doctorStaffId: number | null, value: string) {
        const rows = await this.prisma.doctorCatalogItem.findMany({
            where: { type, doctor_staff_id: doctorStaffId },
        });
        const normalized = value.trim().toLowerCase();
        return rows.find((r) => r.value.trim().toLowerCase() === normalized) ?? null;
    }

    public async create(
        data: {
            type: CatalogItemType;
            value: string;
            doctor_staff_id: number | null;
            created_by_staff_id: number;
            created_via: string;
            usage_count?: number;
            last_used_at?: Date;
        },
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;
        return db.doctorCatalogItem.create({ data });
    }

    public async incrementUsage(catalogItemId: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;
        return db.doctorCatalogItem.update({
            where: { catalog_item_id: catalogItemId },
            data: { usage_count: { increment: 1 }, last_used_at: new Date() },
        });
    }

    public async findById(catalogItemId: number) {
        return this.prisma.doctorCatalogItem.findUnique({ where: { catalog_item_id: catalogItemId } });
    }

    public async update(catalogItemId: number, data: Partial<{ value: string; is_active: boolean; is_pinned: boolean }>) {
        return this.prisma.doctorCatalogItem.update({ where: { catalog_item_id: catalogItemId }, data });
    }

    public async createDismissal(catalogItemId: number, doctorStaffId: number) {
        return this.prisma.catalogItemDismissal.upsert({
            where: { catalog_item_id_doctor_staff_id: { catalog_item_id: catalogItemId, doctor_staff_id: doctorStaffId } },
            create: { catalog_item_id: catalogItemId, doctor_staff_id: doctorStaffId },
            update: {},
        });
    }

    public async removeDismissal(catalogItemId: number, doctorStaffId: number) {
        return this.prisma.catalogItemDismissal.deleteMany({
            where: { catalog_item_id: catalogItemId, doctor_staff_id: doctorStaffId },
        });
    }
}
