export interface CreateStaffDto {
    first_name: string;
    last_name: string;

    username: string;
    email: string;
    mobile_number: string;

    password: string;

    gender_id: number;

    age?: number;

    street_address?: string;
    city?: string;
    state?: string;
    pincode?: string;

    role_id: number;
}

export interface CreateStaffResponseDto {
    message: string;
    data: {
        staff_id: number;
        first_name: string;
        last_name: string;
        username: string;
        email: string;
        mobile_number: string;
        is_account_activated: boolean;
        is_disabled: boolean;
        created_at: string;
        role: {
            role_id: number;
            role_name: string;
        };
    };
}

export interface StaffResponseDto {
    staff_id: number;

    first_name: string;
    last_name: string;

    username: string;
    email: string;
    mobile_number: string;

    is_disabled: boolean;
}

export interface StaffRoleListItemDto {
    role_id: number;
    role_name: string;
}

export interface StaffGenderListItemDto {
    value_id: number;
    value_name: string;
}

export interface GetAllStaffResponseDto {
    message: string;
    data: StaffListItemDto[];
}

export interface StaffRoleListItemDto {
    role_id: number;
    role_name: string;
}

export interface StaffGenderListItemDto {
    value_id: number;
    value_name: string;
}

export interface StaffListItemDto {
    staff_id: number;

    first_name: string;
    last_name: string;

    email: string;
    mobile_number: string;

    gender: StaffGenderListItemDto | null;

    is_disabled: boolean;
    is_account_activated: boolean;

    last_login_at: string | null;
    created_at: string;

    roles: StaffRoleListItemDto[];
}

export interface GetAllStaffResponseDto {
    message: string;
    data: StaffListItemDto[];
    total?: number;
    page?: number;
    limit?: number;
}

export interface StaffDetailItemDto {
    staff_id: number;

    first_name: string;
    last_name: string;

    username: string;

    mobile_number: string;
    email: string;
    
    gender: StaffGenderListItemDto | null;

    age: number | null;
    street_address: string;
    city: string;
    state: string;
    pincode: string;
    roles: StaffRoleListItemDto[];

    is_disabled: boolean;
    is_account_activated: boolean;
    last_login_at: string | null;
    created_at: string;
}

export interface DisableStaffResponseDto {
    success: boolean;
    message: string;
    data: StaffListItemDto;
}