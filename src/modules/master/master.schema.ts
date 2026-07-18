import { z } from "zod";
import { MasterNames } from "constants/master.constants";

export const createMainMasterSchema = z.object({
    master_name: z.string().min(1, "Master name is required").toUpperCase(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});

export const updateMainMasterSchema = z.object({
    master_name: z.string().min(1, "Master name is required").toUpperCase().optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});

export const createValueMasterSchema = z.object({
    master_id: z.number().int().positive("Valid Master ID is required"),
    value_name: z.string().min(1, "Value name is required"),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});

export const updateValueMasterSchema = z.object({
    value_name: z.string().min(1, "Value name is required").optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});

export const createRoleMasterSchema = z.object({
    role_name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});

export const updateRoleMasterSchema = z.object({
    role_name: z.string().min(1, "Role name is required").optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});
