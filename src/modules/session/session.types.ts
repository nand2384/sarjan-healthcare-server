export interface StaffWithRoles {
    staff_id: bigint;
    username: string;

    staff_roles: {
        role: {
            role_name: string;
        };
    }[];
}
