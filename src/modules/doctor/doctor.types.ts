import { Prisma } from "@generated/prisma/client";

export type DoctorListEntity = Prisma.StaffGetPayload<{
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
        username: true;
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
        doctor_profile: {
            select: {
                specialization: true;
                qualification: true;
                registration_number: true;
                biography: true;
                experience: true;
                is_visible_on_website: true;
                is_accepting_appointments: true;
            }
        };
    };
}>;

export type DoctorDetailEntity = Prisma.StaffGetPayload<{
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
        doctor_profile: {
            select: {
                specialization: true;
                qualification: true;
                registration_number: true;
                biography: true;
                experience: true;
                is_visible_on_website: true;
                is_accepting_appointments: true;
                card_photo_key: true;
                pose_photo_key: true;
            }
        };
        is_disabled: true;
        is_account_activated: true;
        last_login_at: true;
        created_at: true;
    };
}>;
