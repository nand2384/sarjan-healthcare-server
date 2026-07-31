import { RegisterAndBookRequestDto, RegisterAndBookResponseDto, SearchDuplicatesRequestDto, SearchDuplicatesResponseDto } from "./patient.dtos";
import { PatientRepository } from "./patient.repository";
import { PatientMapper } from "./patient.mapper";
import { WebSocketPublisher } from "websocket";
import { QueueType } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";

export class PatientService {
    constructor(private readonly patientRepository: PatientRepository) {}

    private async generateUHID(first_name: string, middle_name?: string | null, last_name?: string | null): Promise<string> {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const prefix = `SHC-${month}${year}`;

        const getInitial = (name?: string | null): string => {
            if (!name) return '';
            return name.trim().charAt(0).toUpperCase();
        };

        const patientInitial = (getInitial(first_name) + getInitial(middle_name) + getInitial(last_name)) || 'X';
        const existingUhids = await this.patientRepository.getUhidsByInitial(patientInitial);
        let maxSequence = 0;

        for (const record of existingUhids) {
            const parts = record.uhid.split('-');
            if (parts.length >= 3) {
                const lastPart = parts[parts.length - 1];
                if (lastPart.startsWith(patientInitial)) {
                    const numStr = lastPart.substring(patientInitial.length);
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxSequence) {
                        maxSequence = num;
                    }
                }
            }
        }

        const nextSequence = maxSequence + 1;
        return `${prefix}-${patientInitial}${nextSequence}`;
    }

    public async registerAndBook(data: RegisterAndBookRequestDto, createdByStaffId: number): Promise<RegisterAndBookResponseDto> {
        const { 
            mode, doctor_staff_id, doctor_availability_id, 
            appointment_date, visit_reason_id, ...patientBaseData 
        } = data;

        const uhid = await this.generateUHID(data.first_name, data.middle_name, data.last_name);
        const patientData = { ...patientBaseData, uhid };

        const appointmentStatusId = mode === 'walk-in' ? 5 : 4;
        const parsedAppointmentDate = new Date(appointment_date);

        const appointmentData = {
            doctor_staff_id,
            doctor_availability_id,
            appointment_date: parsedAppointmentDate,
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
        } else {
            const today = new Date();
            const isToday = parsedAppointmentDate.getFullYear() === today.getFullYear() &&
                            parsedAppointmentDate.getMonth() === today.getMonth() &&
                            parsedAppointmentDate.getDate() === today.getDate();

            if (isToday) {
                const queueNumber = await this.patientRepository.getNextQueueNumber(doctor_staff_id, parsedAppointmentDate);
                queueData = {
                    queue_number: queueNumber,
                    queue_type: QueueType.BOOKED,
                    joined_queue_at: parsedAppointmentDate,
                    joined_after_consultation_sequence: 0,
                };
            }
        }

        // Execute Transaction
        const { patient, appointment, queue } = await this.patientRepository.registerAndBookTx(
            patientData as any,
            appointmentData,
            queueData
        );

        WebSocketPublisher.queueUpdated({ appointmentId: appointment.appointment_id }, createdByStaffId, appointment.doctor_staff_id);

        return PatientMapper.toRegisterAndBookResponse(patient, appointment, queue);
    }

    public async bookAppointment(patientId: number, data: any, createdByStaffId: number) {
        const { doctor_staff_id, doctor_availability_id, appointment_date, visit_reason_id, mode = 'call' } = data;

        let appointmentData: any;
        let queueData: any = null;

        if (mode === 'walk-in') {
            const walkInTime = new Date();
            let selectedAvailabilityId = doctor_availability_id || null;
            if (!selectedAvailabilityId) {
                const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                const dayOfWeekStr = days[walkInTime.getDay()];
                const availabilities = await this.patientRepository.getDoctorAvailabilitiesByDay(doctor_staff_id, dayOfWeekStr);
                const walkInMinutes = walkInTime.getHours() * 60 + walkInTime.getMinutes();
                for (const shift of availabilities) {
                    const startMinutes = shift.start_time.getUTCHours() * 60 + shift.start_time.getUTCMinutes();
                    const endMinutes = shift.end_time.getUTCHours() * 60 + shift.end_time.getUTCMinutes();
                    if (walkInMinutes >= startMinutes && walkInMinutes <= endMinutes) {
                        selectedAvailabilityId = shift.doctor_availability_id;
                        break;
                    }
                    if (walkInMinutes < startMinutes) {
                        selectedAvailabilityId = shift.doctor_availability_id;
                        break;
                    }
                    if (walkInMinutes > endMinutes && walkInMinutes <= endMinutes + 60) {
                        selectedAvailabilityId = shift.doctor_availability_id;
                    }
                }
            }

            appointmentData = {
                doctor_staff_id,
                doctor_availability_id: selectedAvailabilityId,
                appointment_date: walkInTime,
                visit_reason_id,
                appointment_status_id: 5, // CHECKED_IN / Walk-in
                created_by_staff_id: createdByStaffId,
            };

            const queueNumber = await this.patientRepository.getNextQueueNumber(doctor_staff_id, walkInTime);
            queueData = {
                queue_number: queueNumber,
                queue_type: QueueType.WALK_IN,
                joined_queue_at: walkInTime,
                joined_after_consultation_sequence: 0,
            };
        } else {
            if (!appointment_date || !doctor_availability_id) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "appointment_date and doctor_availability_id are required for scheduled appointments");
            }
            const date = new Date(appointment_date);

            appointmentData = {
                doctor_staff_id,
                doctor_availability_id,
                appointment_date: date,
                visit_reason_id,
                appointment_status_id: 4, // BOOKED
                created_by_staff_id: createdByStaffId,
            };

            const today = new Date();
            const isToday = date.getFullYear() === today.getFullYear() && 
                            date.getMonth() === today.getMonth() && 
                            date.getDate() === today.getDate();

            if (isToday) {
                const queueNumber = await this.patientRepository.getNextQueueNumber(doctor_staff_id, date);
                queueData = {
                    queue_number: queueNumber,
                    queue_type: QueueType.BOOKED,
                    joined_queue_at: date,
                    joined_after_consultation_sequence: 0,
                };
            }
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

        WebSocketPublisher.queueUpdated({ appointmentId: appointment.appointment_id }, createdByStaffId, appointment.doctor_staff_id);

        return PatientMapper.toRegisterAndBookResponse(patient, appointment, queue);
    }

    public async registerWalkIn(data: any, createdByStaffId: number): Promise<RegisterAndBookResponseDto> {
        const { 
            mode: _mode, doctor_staff_id, current_time, 
            visit_reason_id, doctor_availability_id: _doctor_availability_id, appointment_date: _appointment_date,
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

        const uhid = await this.generateUHID(data.first_name, data.middle_name, data.last_name);
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

        WebSocketPublisher.queueUpdated({ appointmentId: appointment.appointment_id }, createdByStaffId, appointment.doctor_staff_id);

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

    public async searchDuplicates(query: SearchDuplicatesRequestDto): Promise<SearchDuplicatesResponseDto> {
        const records = await this.patientRepository.findDuplicatesByName(query);
        return PatientMapper.toSearchDuplicatesResponse(records, query);
    }
}
