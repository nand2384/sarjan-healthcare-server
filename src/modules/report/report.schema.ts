import { z } from "zod";

// One-way bug report: a free-text description plus where the reporter was.
// page_path/page_label are filled in automatically by the client from the URL
// the reporter is on (not typed by them); everything else is captured
// server-side (reporter identity from the session, device from the request).
export const createReportSchema = z.object({
    page_path: z.string().trim().max(300).default(""),
    page_label: z.string().trim().min(1).max(120).default("Not page-specific"),
    description: z.string().trim().min(1, "Please describe the problem").max(2000, "Please keep the description under 2000 characters"),
});

export type CreateReportSchema = z.infer<typeof createReportSchema>;

export const listReportsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListReportsQuerySchema = z.infer<typeof listReportsQuerySchema>;
