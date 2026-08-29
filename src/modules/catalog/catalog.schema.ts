import { z } from "zod";

export const catalogItemTypeSchema = z.enum(["SYMPTOM", "DIAGNOSIS", "MEDICINE", "INVESTIGATION"]);
export type CatalogItemTypeDto = z.infer<typeof catalogItemTypeSchema>;

export const getCatalogQuerySchema = z.object({
    type: catalogItemTypeSchema,
});

export const createCatalogItemSchema = z.object({
    type: catalogItemTypeSchema,
    value: z.string().trim().min(1, "Value is required").max(200),
    // Lead Doctor only — omit (or "personal") to add to the caller's own list.
    scope: z.enum(["personal", "global"]).default("personal"),
});
export type CreateCatalogItemDto = z.infer<typeof createCatalogItemSchema>;

export const updateCatalogItemSchema = z.object({
    value: z.string().trim().min(1).max(200).optional(),
    is_active: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
});
export type UpdateCatalogItemDto = z.infer<typeof updateCatalogItemSchema>;
