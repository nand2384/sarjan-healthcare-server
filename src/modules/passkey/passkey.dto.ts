import type { 
    RegistrationResponseJSON,
    AuthenticationResponseJSON
} from "@simplewebauthn/server";

export interface GenerateAuthenticationOptionsRequestDto {
    identifier: string;
}

export interface VerifyAuthenticationRequestDto {
    identifier: string;
    payload: AuthenticationResponseJSON;
}

export type VerifyRegistrationRequestDto = RegistrationResponseJSON;

export interface UpdatePasskeyNameRequestDto {
    name: string;
}

export interface PasskeyListItemDto {
    id: string;
    deviceType: string;
    deviceName: string | null;
    backedUp: boolean;
    createdAt: Date;
    lastUsedAt: Date | null;
}

export interface LoginResponseDto {
    staff_id: number;
    username: string;
    roles: string[];
}
