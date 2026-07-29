import { z } from "zod";
import { registerAndBookSchema, registerWalkInSchema, updateProfileSchema, searchDuplicatesSchema } from "./patient.schema";

export type RegisterAndBookRequestDto = z.infer<typeof registerAndBookSchema>;
export type WalkInRequestDto = z.infer<typeof registerWalkInSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type SearchDuplicatesRequestDto = z.infer<typeof searchDuplicatesSchema>;

export interface RegisterAndBookResponseDto {
    patient_id: number;
    uhid: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    appointment_id: number;
    appointment_status_id: number;
    queue_number: number | null;
}

export interface PatientSearchItemDto {
    patient_id: number;
    uhid: string;
    first_name: string;
    middle_name?: string | null;
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

export interface DuplicatePatientItemDto {
    patient_id: number;
    uhid: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    mobile_number?: string | null;
    ui_full_name: string;
    ui_demographics: string;
    ui_matched_params: string[];
    ui_match_badge: string;
}

export interface SearchDuplicatesResponseDto {
    suggestions: {
        first_names: string[];
        middle_names: string[];
        last_names: string[];
    };
    matched_patients: DuplicatePatientItemDto[];
}
