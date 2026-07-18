import { CreateDoctorSchema, UpdateDoctorDto } from "./doctor.schema";

export type CreateDoctorDto = CreateDoctorSchema;

export interface CreateDoctorResponseDto {
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
        specialization: string;
        qualification: string;
    };
}
