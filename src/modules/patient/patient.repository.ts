import { Prisma, PrismaClient, Patient, Appointment, Queue } from "@generated/prisma/client";

export class PatientRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getLastPatientByUhidPrefix(prefix: string, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return await prisma.patient.findFirst({
            where: { uhid: { startsWith: prefix } },
            orderBy: { uhid: 'desc' },
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
        
        let where: Prisma.PatientWhereInput = { deleted_at: null };
        
        if (searchTerms.length > 0) {
            where.OR = searchTerms.map(term => ({
                OR: [
                    { first_name: { contains: term, mode: 'insensitive' } },
                    { last_name: { contains: term, mode: 'insensitive' } },
                    { mobile_number: { contains: term } },
                    { uhid: { contains: term, mode: 'insensitive' } }
                ]
            }));
        }

        const [patients, total] = await this.prisma.$transaction([
            this.prisma.patient.findMany({
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' }
            }),
            this.prisma.patient.count({ where })
        ]);

        return { patients, total };
    }
}
