import { UserRole } from "common/common.schema";

export interface LoginRequestDto {
    username: string;
    password: string;

    ipAddress: string | null;
    userAgent: string | null;
}

export interface LoginResponseDto {
    staff_id: number;
    username: string;
    roles: string[];
}

export interface MeResponseDto {
    staff_id: number;
    username: string;
    roles: UserRole[];
}
