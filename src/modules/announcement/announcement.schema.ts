import { z } from "zod";
import { AnnouncementTargetType } from "@generated/prisma/client";

export const createAnnouncementSchema = z.object({
    message: z.string().trim().min(1, "Message is required"),
    type: z.enum(["info", "warning", "danger"]),
    target_type: z.nativeEnum(AnnouncementTargetType),
    target_staff_id: z.number().int().positive().optional(),
    target_role_id: z.number().int().positive().optional(),
    send_email: z.boolean().optional().default(false),
}).refine(
    (data) => data.target_type !== AnnouncementTargetType.STAFF || !!data.target_staff_id,
    { message: "target_staff_id is required when target_type is STAFF", path: ["target_staff_id"] },
).refine(
    (data) => data.target_type !== AnnouncementTargetType.ROLE || !!data.target_role_id,
    { message: "target_role_id is required when target_type is ROLE", path: ["target_role_id"] },
);

export type CreateAnnouncementSchema = z.infer<typeof createAnnouncementSchema>;
