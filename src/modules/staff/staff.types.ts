import { Prisma } from "@generated/prisma/client";

export type StaffListEntity = Prisma.StaffGetPayload<{
    select: {
        staff_id: true;

        first_name: true;
        last_name: true;

        email: true;
        mobile_number: true;

        is_disabled: true;
        is_account_activated: true;

        last_login_at: true;
        created_at: true;

        locked_until: true;
        failed_login_count: true;

        gender: {
            select: {
                value_id: true;
                value_name: true;
            };
        };

        staff_roles: {
            select: {
                role: {
                    select: {
                        role_id: true;
                        role_name: true;
                    };
                };
            };
        };
    };
}>;

export type StaffDetailEntity = Prisma.StaffGetPayload<{
    select: {
        staff_id: true;
        first_name: true;
        last_name: true;
        username: true;
        mobile_number: true;
        email: true;
        gender: {
            select: {
                value_id: true;
                value_name: true;
            };
        };
        age: true;
        street_address: true;
        city: true;
        state: true;
        pincode: true;
        staff_roles: {
            select: {
                role: {
                    select: {
                        role_id: true;
                        role_name: true;
                    };
                };
            };
        };
        is_disabled: true;
        is_account_activated: true;
        last_login_at: true;
        created_at: true;
        locked_until: true;
        failed_login_count: true;
    };
}>;
