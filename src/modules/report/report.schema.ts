import { z } from "zod";
import { ReportType, ReportStatus } from "@generated/prisma/client";

export const createReportSchema = z.object({
    report_type: z.nativeEnum(ReportType),
    page_path: z.string().trim(),
    page_label: z.string().trim().min(1, "Page label is required"),
    description: z.string().trim().min(1, "Description is required"),
});

export type CreateReportSchema = z.infer<typeof createReportSchema>;

export const updateReportStatusSchema = z.object({
    status: z.nativeEnum(ReportStatus),
    developer_notes: z.string().trim().optional(),
});

export type UpdateReportStatusSchema = z.infer<typeof updateReportStatusSchema>;

export const createReportMessageSchema = z.object({
    message: z.string().trim().min(1, "Message is required"),
});

export type CreateReportMessageSchema = z.infer<typeof createReportMessageSchema>;

export const listReportsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.nativeEnum(ReportStatus).optional(),
    report_type: z.nativeEnum(ReportType).optional(),
});

export type ListReportsQuerySchema = z.infer<typeof listReportsQuerySchema>;
