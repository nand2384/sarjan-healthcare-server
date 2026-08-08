import { Prisma, PrismaClient, Patient, Appointment, Queue } from "@generated/prisma/client";

export class PatientRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getUhidsByInitial(patientInitial: string, tx?: Prisma.TransactionClient): Promise<{ uhid: string }[]> {
        const prisma = tx ?? this.prisma;
        return await prisma.patient.findMany({
            where: { uhid: { contains: `-${patientInitial}` } },
            select: { uhid: true },
        });
    }

    public async getDoctorAvailabilitiesByDay(doctorId: number, dayOfWeek: any) {
        return await this.prisma.doctorAvailability.findMany({
            where: { 
                doctor_staff_id: doctorId,
                day_of_week: dayOfWeek,
                deleted_at: null 
            },
            orderBy: { start_time: 'asc' }
        });
    }

    public async getNextQueueNumber(doctorId: number, date: Date, tx?: Prisma.TransactionClient): Promise<number> {
        const prisma = tx ?? this.prisma;
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const lastQueue = await prisma.queue.findFirst({
            where: {
                joined_queue_at: { gte: startOfDay, lte: endOfDay },
                appointment: { doctor_staff_id: doctorId }
            },
            orderBy: { queue_number: 'desc' }
        });

        return lastQueue ? lastQueue.queue_number + 1 : 1;
    }

    /** Minimal shape needed to enqueue/format an appointment reminder — see PatientService's booking-time hook. */
    public async getAppointmentReminderContext(appointmentId: number) {
        return this.prisma.appointment.findUnique({
            where: { appointment_id: appointmentId },
            select: {
                appointment_id: true,
                appointment_date: true,
                patient: { select: { first_name: true, last_name: true, whatsapp_number: true } },
                doctor: { select: { first_name: true, last_name: true } },
                doctor_availability: { select: { start_time: true, end_time: true } },
            },
        });
    }

    public async registerAndBookTx(
        patientData: Prisma.PatientCreateInput,
        appointmentData: any, // We pass foreign keys directly here
        queueData: any | null
    ): Promise<{ patient: Patient, appointment: Appointment, queue: Queue | null }> {
        // Runs all 3 queries inside a single robust transaction
        return this.prisma.$transaction(async (tx) => {
            const patient = await tx.patient.create({ data: patientData });
            
            const appointment = await tx.appointment.create({
                data: {
                    ...appointmentData,
                    patient_id: patient.patient_id,
                }
            });

            let queue = null;
            if (queueData) {
                queue = await tx.queue.create({
                    data: {
                        ...queueData,
                        appointment_id: appointment.appointment_id,
                    }
                });

                await tx.appointmentWorkflowHistory.create({
                    data: {
                        appointment_id: appointment.appointment_id,
                        appointment_workflow_status_id: appointment.appointment_status_id,
                        changed_by_staff_id: appointment.created_by_staff_id,
                        remarks: "Patient joined the queue"
                    }
                });
            }

            return { patient, appointment, queue };
        });
    }

    public async bookAppointmentTx(
        patientId: number,
        appointmentData: any, // We pass foreign keys directly here
        queueData: any | null
    ) {
        // Runs all queries inside a single robust transaction
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.create({
                data: {
                    ...appointmentData,
                    patient_id: patientId,
                }
            });

            // Touch patient's updated_at timestamp so they appear at the top of active directory feeds
            await tx.patient.update({
                where: { patient_id: patientId },
                data: { updated_at: new Date() }
            });

            let queue = null;
            if (queueData) {
                queue = await tx.queue.create({
                    data: {
                        ...queueData,
                        appointment_id: appointment.appointment_id,
                    }
                });

                await tx.appointmentWorkflowHistory.create({
                    data: {
                        appointment_id: appointment.appointment_id,
                        appointment_workflow_status_id: appointment.appointment_status_id,
                        changed_by_staff_id: appointment.created_by_staff_id,
                        remarks: "Patient joined the queue"
                    }
                });
            }

            return { appointment, queue };
        });
    }

    public async updatePatientProfile(patientId: number, data: any) {
        return this.prisma.patient.update({
            where: { patient_id: patientId },
            data: {
                ...data,
                is_account_complete: true,
            }
        });
    }

    public async searchPatients(query: string, skip: number, take: number) {
        const searchTerms = query.split(' ').filter(t => t.trim().length > 0);
        
        const where: Prisma.PatientWhereInput = { deleted_at: null };
        
        if (searchTerms.length > 0) {
            where.OR = searchTerms.map(term => ({
                OR: [
                    { first_name: { contains: term, mode: 'insensitive' } },
                    { middle_name: { contains: term, mode: 'insensitive' } },
                    { last_name: { contains: term, mode: 'insensitive' } },
                    { mobile_number: { contains: term } },
                    { uhid: { contains: term, mode: 'insensitive' } }
                ]
            }));
        } else {
            // General Patients List: exclude patients with an active appointment TODAY only.
            // Patients with future appointments or completed/cancelled/walked-out today should still appear.
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            where.appointments = {
                none: {
                    appointment_date: { gte: today, lt: tomorrow },
                    // Only exclude if the appointment is still active (not a terminal status)
                    appointment_status_id: { notIn: [6, 7, 15, 16] } // COMPLETED, CANCELLED, WALKED_OUT, NO_SHOW
                }
            };
        }

        const [patients, total] = await this.prisma.$transaction([
            this.prisma.patient.findMany({
                where,
                skip,
                take,
                include: {
                    gender: { select: { value_name: true } },
                    appointments: {
                        include: {
                            doctor: { select: { first_name: true, last_name: true } },
                            doctor_availability: { select: { start_time: true, end_time: true } },
                            visit_reason: { select: { value_name: true } },
                            appointment_status: { select: { value_name: true } }
                        },
                        orderBy: { appointment_date: 'desc' },
                        take: 10
                    }
                },
                orderBy: { updated_at: 'desc' }
            }),
            this.prisma.patient.count({ where })
        ]);

        return { patients, total };
    }

    public async findDuplicatesByName(params: { first_name?: string; middle_name?: string; last_name?: string; mobile_number?: string }) {
        const orConditions: Prisma.PatientWhereInput[] = [];

        if (params.first_name && params.first_name.trim().length >= 2) {
            orConditions.push({ first_name: { contains: params.first_name.trim(), mode: 'insensitive' } });
        }
        if (params.middle_name && params.middle_name.trim().length >= 2) {
            orConditions.push({ middle_name: { contains: params.middle_name.trim(), mode: 'insensitive' } });
        }
        if (params.last_name && params.last_name.trim().length >= 2) {
            orConditions.push({ last_name: { contains: params.last_name.trim(), mode: 'insensitive' } });
        }
        if (params.mobile_number && params.mobile_number.trim().length >= 5) {
            orConditions.push({ mobile_number: { contains: params.mobile_number.trim() } });
        }

        if (orConditions.length === 0) {
            return [];
        }

        return await this.prisma.patient.findMany({
            where: {
                deleted_at: null,
                OR: orConditions
            },
            select: {
                patient_id: true,
                uhid: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                mobile_number: true,
                age: true,
                gender: {
                    select: {
                        value_name: true
                    }
                }
            },
            take: 30,
            orderBy: { created_at: 'desc' }
        });
    }
}
