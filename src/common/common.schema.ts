import { z } from "zod";

export const USER_ROLE = {
    ADMIN: "admin",
    RECEPTIONIST: "receptionist",
    DOCTOR: "doctor",
    PATIENT: "patient",
    PHARMACIST: "pharmacist",
    DEVELOPER: "developer",
} as const;

export const USER_ROLE_ID = {
    ADMIN: 1,
    DOCTOR: 2,
    RECEPTIONIST: 3,
    PHARMACIST: 4,
    DEVELOPER: 5,
} as const;

export const userRoleSchema = z.enum([
    USER_ROLE.ADMIN,
    USER_ROLE.RECEPTIONIST,
    USER_ROLE.DOCTOR,
    USER_ROLE.PATIENT,
    USER_ROLE.PHARMACIST,
    USER_ROLE.DEVELOPER,
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const masterValueParamSchema = z.object({
    masterId: z.coerce.number().int().positive(),
    valueId: z.coerce.number().int().positive(),
});