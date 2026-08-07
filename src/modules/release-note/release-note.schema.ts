import { z } from "zod";

export const createReleaseNoteSchema = z.object({
    version_label: z.string().min(1).max(50),
    title: z.string().min(1).max(200),
    body: z.string().min(1),
});

export const getReleaseNotesSchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
});
