type CatalogItemEntity = {
    catalog_item_id: number;
    type: string;
    value: string;
    doctor_staff_id: number | null;
    usage_count: number;
    last_used_at: Date | null;
    is_pinned: boolean;
    is_active: boolean;
    created_via: string;
    scope?: "personal" | "default";
    canHide?: boolean;
};

export class CatalogMapper {
    public static toDto(item: CatalogItemEntity) {
        const scope = item.scope ?? (item.doctor_staff_id === null ? "default" : "personal");
        return {
            catalog_item_id: item.catalog_item_id,
            type: item.type,
            value: item.value,
            scope,
            usage_count: item.usage_count,
            last_used_at: item.last_used_at ? item.last_used_at.toISOString() : null,
            is_pinned: item.is_pinned,
            canHide: item.canHide ?? (scope === "default" && !item.is_pinned),
            created_via: item.created_via,
        };
    }
}
