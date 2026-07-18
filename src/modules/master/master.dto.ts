export interface MasterItemDto {
    value_id: number;
    value_name: string;
}

export interface RoleItemDto {
    role_id: number;
    role_name: string;
}

export interface GetMastersResponseDto {
    genders: MasterItemDto[];
    roles: RoleItemDto[];
}

export interface CreateMainMasterDto {
    master_name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateMainMasterDto {
    master_name?: string;
    description?: string;
    is_active?: boolean;
}

export interface CreateValueMasterDto {
    master_id: number;
    value_name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateValueMasterDto {
    value_name?: string;
    description?: string;
    is_active?: boolean;
}

export interface CreateRoleMasterDto {
    role_name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateRoleMasterDto {
    role_name?: string;
    description?: string;
    is_active?: boolean;
}