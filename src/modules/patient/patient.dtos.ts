import { z } from "zod";
import { registerAndBookSchema, registerWalkInSchema, updateProfileSchema } from "./patient.schema";

export type RegisterAndBookRequestDto = z.infer<typeof registerAndBookSchema>;
export type WalkInRequestDto = z.infer<typeof registerWalkInSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export interface RegisterAndBookResponseDto {
    patient_id: number;
    uhid: string;
    first_name: string;
    last_name: string;
    appointment_id: number;
    appointment_status_id: number;
    queue_number: number | null;
}

export interface PatientSearchItemDto {
    patient_id: number;
    uhid: string;
    first_name: string;
    last_name: string;
    mobile_number: string;
    gender: string;
    age: number;
    is_account_complete: boolean;
}

export interface PatientSearchResponseDto {
    items: PatientSearchItemDto[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
