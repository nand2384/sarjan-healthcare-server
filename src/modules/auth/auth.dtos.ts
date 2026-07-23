import { UserRole } from "common/common.schema";

export interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

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
    first_name: string;
    last_name: string;
    email: string;
    mobile_number: string;
    roles: UserRole[];
}

export interface VerifyActivationRequestDto {
    activationToken: string;
}

export interface VerifyActivationResponseDto {
    success: boolean;
    data: VerifyActivationResponse;
}

export type VerifyActivationResponse = {
    staff_id: number;
    first_name: string;
    username: string;
    activationToken: string;
}

export interface CompleteActivationRequestDto {
    staff_id: number;
    activationToken: string;
    password: string;
}

export type CompleteActivationResponseDto = {
    success: boolean;
    message: string;
}

export interface ResendActivationResponseDto {
    success: boolean;
    message: string;
}

export interface GetProfileDetailDto {
    success: boolean;
    data: {
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        mobile_number: string;
        roles: string[];
    }
}

export interface UpdateProfileRequestDto {
    firstName: string;
    lastName: string;
    mobileNumber: string;
}

export interface UpdateProfileResponseDto {
    success: boolean;
    message: string;
    data: {
        first_name: string;
        last_name: string;
        email: string;
        mobile_number: string;
    }
}