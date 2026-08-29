import { z } from "zod";

export const USER_ROLE = {
    ADMIN: "admin",
    RECEPTIONIST: "receptionist",
    DOCTOR: "doctor",
    // Matches auth.service.ts's `role_name.toLowerCase()` session-role
    // derivation — the RoleMaster row is seeded as "Lead Doctor", so the
    // lowercased session value has a space, not an underscore.
    LEAD_DOCTOR: "lead doctor",
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
    // Not 6 — the role_master autoincrement sequence had already drifted
    // ahead from prior dev activity by the time this row was seeded; this is
    // the actual role_id Postgres assigned. Verify with
    // `SELECT role_id FROM role_master WHERE role_name = 'Lead Doctor'`
    // before ever changing this.
    LEAD_DOCTOR: 32,
} as const;

// Lead Doctor has every Doctor permission plus lead-only configuration
// screens — it replaces the Doctor role for that person (never held
// alongside it). Anywhere "is this staff a doctor" is checked by role_id
// must use this list, not a bare USER_ROLE_ID.DOCTOR comparison.
export const DOCTOR_ROLE_IDS: number[] = [USER_ROLE_ID.DOCTOR, USER_ROLE_ID.LEAD_DOCTOR];

export const userRoleSchema = z.enum([
    USER_ROLE.ADMIN,
    USER_ROLE.RECEPTIONIST,
    USER_ROLE.DOCTOR,
    USER_ROLE.LEAD_DOCTOR,
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