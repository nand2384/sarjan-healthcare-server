import { z } from "zod";

export const createTestCatalogSchema = z.object({
    test_name: z.string().min(1, "Test name is required"),
    price: z.coerce.number().positive("Price must be a positive number"),
    is_active: z.boolean().optional(),
});

export const updateTestCatalogSchema = z.object({
    test_name: z.string().min(1, "Test name is required").optional(),
    price: z.coerce.number().positive("Price must be a positive number").optional(),
    is_active: z.boolean().optional(),
});

export const updateDoctorFeesSchema = z.object({
    old_case_fee: z.coerce.number().positive("Old-case fee must be a positive number"),
    new_case_fee: z.coerce.number().positive("New-case fee must be a positive number"),
});

export const checkoutSchema = z.object({
    additional_test_catalog_ids: z.array(z.number().int().positive()).default([]),
    payment_method: z.enum(["CASH", "CARD", "UPI"]),
});
