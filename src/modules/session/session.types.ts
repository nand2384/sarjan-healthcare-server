export interface StaffWithRoles {
    staff_id: number;
    username: string;

    staff_roles: {
        role: {
            role_name: string;
        };
    }[];
}

export interface RedisSessionData {
    session_id: string;
    staff_id: number;
    username: string;
    roles: string[];
    expires_at: string;
}