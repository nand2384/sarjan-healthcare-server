import { AppError, ErrorCode } from "@errors";
import { CatalogItemType } from "@generated/prisma/client";
import { CatalogRepository } from "./catalog.repository";
import { CreateCatalogItemDto, UpdateCatalogItemDto } from "./catalog.schema";

export class CatalogService {
    constructor(private readonly catalogRepository: CatalogRepository) {}

    public async getSuggestions(type: CatalogItemType, doctorStaffId: number) {
        const { personal, defaults } = await this.catalogRepository.findMergedSuggestions(type, doctorStaffId);

        const personalNormalized = new Set(personal.map((p) => p.value.trim().toLowerCase()));
        const merged = [
            ...personal.map((p) => ({ ...p, scope: "personal" as const, canHide: false })),
            ...defaults
                .filter((d) => !personalNormalized.has(d.value.trim().toLowerCase()))
                .map((d) => ({ ...d, scope: "default" as const, canHide: !d.is_pinned })),
        ];

        merged.sort((a, b) => {
            if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
            const aTime = a.last_used_at ? a.last_used_at.getTime() : 0;
            const bTime = b.last_used_at ? b.last_used_at.getTime() : 0;
            if (bTime !== aTime) return bTime - aTime;
            return a.value.localeCompare(b.value);
        });

        return merged;
    }

    public async addItem(dto: CreateCatalogItemDto, callerStaffId: number, isLeadOrAdmin: boolean) {
        if (dto.scope === "global" && !isLeadOrAdmin) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "Only Lead Doctor can add clinic-wide default catalog items.");
        }

        const doctorStaffId = dto.scope === "global" ? null : callerStaffId;

        const existing = await this.catalogRepository.findByNormalizedValue(dto.type, doctorStaffId, dto.value);
        if (existing) return existing;

        return this.catalogRepository.create({
            type: dto.type,
            value: dto.value.trim(),
            doctor_staff_id: doctorStaffId,
            created_by_staff_id: callerStaffId,
            created_via: "MANUAL",
        });
    }

    public async updateItem(catalogItemId: number, dto: UpdateCatalogItemDto, callerStaffId: number, isLeadOrAdmin: boolean) {
        const item = await this.getOwnedItemOrThrow(catalogItemId, callerStaffId, isLeadOrAdmin);
        if (dto.is_pinned !== undefined && item.doctor_staff_id !== null) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Only clinic-wide default items can be pinned.");
        }
        return this.catalogRepository.update(catalogItemId, dto);
    }

    public async deleteItem(catalogItemId: number, callerStaffId: number, isLeadOrAdmin: boolean) {
        await this.getOwnedItemOrThrow(catalogItemId, callerStaffId, isLeadOrAdmin);
        return this.catalogRepository.update(catalogItemId, { is_active: false });
    }

    public async dismissDefault(catalogItemId: number, callerStaffId: number) {
        const item = await this.catalogRepository.findById(catalogItemId);
        if (!item) throw new AppError(404, ErrorCode.NOT_FOUND, "Catalog item not found.");
        if (item.doctor_staff_id !== null) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Only clinic-wide default items can be hidden.");
        }
        if (item.is_pinned) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "This default item cannot be hidden.");
        }
        return this.catalogRepository.createDismissal(catalogItemId, callerStaffId);
    }

    public async undismissDefault(catalogItemId: number, callerStaffId: number) {
        return this.catalogRepository.removeDismissal(catalogItemId, callerStaffId);
    }

    /** Auto-learn hook, called from consultation submission — silently upserts personal catalog entries. */
    public async recordUsageFromConsultation(doctorStaffId: number, valuesByType: Partial<Record<CatalogItemType, string[]>>) {
        for (const [type, values] of Object.entries(valuesByType) as [CatalogItemType, string[] | undefined][]) {
            if (!values) continue;
            for (const rawValue of values) {
                const value = rawValue?.trim();
                if (!value) continue;

                const existing = await this.catalogRepository.findByNormalizedValue(type, doctorStaffId, value);
                if (existing) {
                    await this.catalogRepository.incrementUsage(existing.catalog_item_id);
                } else {
                    await this.catalogRepository.create({
                        type,
                        value,
                        doctor_staff_id: doctorStaffId,
                        created_by_staff_id: doctorStaffId,
                        created_via: "AUTO_LEARNED",
                        usage_count: 1,
                        last_used_at: new Date(),
                    });
                }
            }
        }
    }

    private async getOwnedItemOrThrow(catalogItemId: number, callerStaffId: number, isLeadOrAdmin: boolean) {
        const item = await this.catalogRepository.findById(catalogItemId);
        if (!item) throw new AppError(404, ErrorCode.NOT_FOUND, "Catalog item not found.");

        const isDefault = item.doctor_staff_id === null;
        if (isDefault && !isLeadOrAdmin) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "Only Lead Doctor can edit clinic-wide default catalog items.");
        }
        if (!isDefault && item.doctor_staff_id !== callerStaffId) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "You can only edit your own catalog items.");
        }
        return item;
    }
}
