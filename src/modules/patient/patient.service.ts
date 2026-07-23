import { RegisterAndBookRequestDto, RegisterAndBookResponseDto } from "./patient.dtos";
import { PatientRepository } from "./patient.repository";
import { PatientMapper } from "./patient.mapper";
import { QueueType } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";

export class PatientService {
    constructor(private readonly patientRepository: PatientRepository) {}

    private async generateUHID(): Promise<string> {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const prefix = `SHC-${month}${year}`;

        const lastPatient = await this.patientRepository.getLastPatientByUhidPrefix(prefix);
        let nextSequence = 1;
        if (lastPatient && lastPatient.uhid) {
            const parts = lastPatient.uhid.split('-');
            if (parts.length === 3) {
                nextSequence = parseInt(parts[2], 10) + 1;
            }
        }
        return `${prefix}-${String(nextSequence).padStart(4, '0')}`;
    }

    public async registerAndBook(data: RegisterAndBookRequestDto, createdByStaffId: number): Promise<RegisterAndBookResponseDto> {
        const { 
            mode, doctor_staff_id, doctor_availability_id, 
            appointment_date, visit_reason_id, ...patientBaseData 
        } = data;

        const uhid = await this.generateUHID();
        const patientData = { ...patientBaseData, uhid };

        const appointmentStatusId = mode === 'walk-in' ? 5 : 4;

        const appointmentData = {
            doctor_staff_id,
            doctor_availability_id,
            appointment_date: new Date(appointment_date),
            visit_reason_id,
            appointment_status_id: appointmentStatusId,
            created_by_staff_id: createdByStaffId,
        };

        // Determine Queue
        let queueData = null;
        if (mode === 'walk-in') {
            const today = new Date();
            const queueNumber = await this.patientRepository.getNextQueueNumber(doctor_staff_id, today);
            queueData = {
                queue_number: queueNumber,
                queue_type: QueueType.WALK_IN,
                joined_queue_at: today,
                joined_after_consultation_sequence: 0,
            };
        }

        // Execute Transaction
        const { patient, appointment, queue } = await this.patientRepository.registerAndBookTx(
            patientData as any, 
            appointmentData, 
            queueData
        );

        return PatientMapper.toRegisterAndBookResponse(patient, appointment, queue);
    }

    public async bookAppointment(patientId: number, data: any, createdByStaffId: number) {
        const { doctor_staff_id, doctor_availability_id, appointment_date, visit_reason_id } = data;

        const date = new Date(appointment_date);

        const appointmentData = {
            doctor_staff_id,
            doctor_availability_id,
            appointment_date: date,
            visit_reason_id,
            appointment_status_id: 2, // Booked
            created_by_staff_id: createdByStaffId,
        };

        const today = new Date();
        const isToday = date.getFullYear() === today.getFullYear() && 
                        date.getMonth() === today.getMonth() && 
                        date.getDate() === today.getDate();

        let queueData = null;
        if (isToday) {
            const queueNumber = await this.patientRepository.getNextQueueNumber(doctor_staff_id, date);
            queueData = {
                queue_number: queueNumber,
                queue_type: QueueType.BOOKED,
                joined_queue_at: date,
                joined_after_consultation_sequence: 0,
            };
            appointmentData.appointment_status_id = 4; // Expected Today
        }

        const { appointment, queue } = await this.patientRepository.bookAppointmentTx(
            patientId, 
            appointmentData, 
            queueData
        );

        // Fetch patient for DTO mapping
        const patient = await this.patientRepository['prisma'].patient.findUnique({
            where: { patient_id: patientId }
        });

        if (!patient) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Patient not found");
        }

        return PatientMapper.toRegisterAndBookResponse(patient, appointment, queue);
    }

    public async registerWalkIn(data: any, createdByStaffId: number): Promise<RegisterAndBookResponseDto> {
        const { 
            mode, doctor_staff_id, current_time, 
            visit_reason_id, doctor_availability_id, appointment_date,
            ...patientBaseData 
        } = data;

        const walkInTime = new Date(current_time);
        
        // 1. Calculate DayOfWeek
        const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        const dayOfWeekStr = days[walkInTime.getDay()];

        // 2. Fetch Availabilities
        const availabilities = await this.patientRepository.getDoctorAvailabilitiesByDay(doctor_staff_id, dayOfWeekStr);

        let selectedAvailabilityId: number | null = null;
        
        const walkInMinutes = walkInTime.getHours() * 60 + walkInTime.getMinutes();

        for (const shift of availabilities) {
            const startMinutes = shift.start_time.getUTCHours() * 60 + shift.start_time.getUTCMinutes();
            const endMinutes = shift.end_time.getUTCHours() * 60 + shift.end_time.getUTCMinutes();

            // Active Shift
            if (walkInMinutes >= startMinutes && walkInMinutes <= endMinutes) {
                selectedAvailabilityId = shift.doctor_availability_id;
                break;
            }
            
            // Upcoming Shift
            if (walkInMinutes < startMinutes) {
                selectedAvailabilityId = shift.doctor_availability_id;
                break;
            }

            // Grace Period (if it's the last shift processed so far, and we are within 60 mins after it ended)
            if (walkInMinutes > endMinutes && walkInMinutes <= endMinutes + 60) {
                // We don't break immediately because there might be another upcoming shift later today.
                // If there is another shift, the 'Upcoming Shift' block will catch it and overwrite this.
                selectedAvailabilityId = shift.doctor_availability_id;
            }
        }

        const uhid = await this.generateUHID();
        const patientData = { ...patientBaseData, uhid };

        const appointmentData = {
            doctor_staff_id,
            doctor_availability_id: selectedAvailabilityId, // This can now be null
            appointment_date: walkInTime,
            visit_reason_id,
            appointment_status_id: 5, // Walk-in
            created_by_staff_id: createdByStaffId,
        };

        // Determine Queue
        const queueNumber = await this.patientRepository.getNextQueueNumber(doctor_staff_id, walkInTime);
        const queueData = {
            queue_number: queueNumber,
            queue_type: QueueType.WALK_IN,
            joined_queue_at: walkInTime,
            joined_after_consultation_sequence: 0,
        };

        // Execute Transaction
        const { patient, appointment, queue } = await this.patientRepository.registerAndBookTx(
            patientData as any, 
            appointmentData, 
            queueData
        );

        return PatientMapper.toRegisterAndBookResponse(patient, appointment, queue);
    }

    public async updatePatientProfile(patientId: number, data: any) {
        return this.patientRepository.updatePatientProfile(patientId, data);
    }

    public async searchPatients(query: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const take = limit;

        const { patients, total } = await this.patientRepository.searchPatients(query, skip, take);
        return PatientMapper.toPatientSearchResponse(patients, total, page, limit);
    }
}
