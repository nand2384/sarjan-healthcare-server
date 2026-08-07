import { z } from "zod";
import { AuditAction, AuditEntityType } from "@generated/prisma/client";

export const getAuditLogsSchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().optional(),
    entity_type: z.nativeEnum(AuditEntityType).optional(),
    action: z.preprocess(
        (val) => (typeof val === "string" && val.includes(",") ? val.split(",") : val),
        z.union([z.nativeEnum(AuditAction), z.array(z.nativeEnum(AuditAction))]),
    ).optional(),
    performed_by_staff_id: z.coerce.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
});
