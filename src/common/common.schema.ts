import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "receptionist", "doctor", "patient", "pharmacist"]);

export type UserRole = z.infer<typeof userRoleSchema>;
