import { PrismaClient, QueueType } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";

export class ReceptionistRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getDoctorsInOpd(today: Date, tomorrow: Date) {
        return this.prisma.staff.findMany({
            where: {
                staff_roles: { some: { role_id: 2 } },
                doctor_profile: { isNot: null }
            },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                doctor_profile: { select: { specialization: true } },
                doctor_appointments: {
                    where: {
                        appointment_date: { gte: today, lt: tomorrow },
                        queue: { is_active: true }
                    },
                    select: {
                        appointment_id: true,
                        appointment_status_id: true,
                        patient: {
                            select: {
                                patient_id: true,
                                first_name: true,
                                last_name: true,
                                mobile_number: true,
                                is_account_complete: true,
                            }
                        },
                        queue: {
                            select: {
                                queue_number: true,
                                queue_type: true,
                            }
                        }
                    },
                    orderBy: { queue: { joined_queue_at: 'asc' } }
                }
            }
        });
    }

    public async getAllAppointments(today: Date, tomorrow: Date) {
        return this.prisma.appointment.findMany({
            where: {
                appointment_date: { gte: today, lt: tomorrow },
                appointment_status: {
                    value_name: 'BOOKED'
                }
            },
            include: {
                patient: true,
                doctor: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                doctor_availability: true,
                visit_reason: true,
                queue: true
            },
            orderBy: [
                { appointment_date: 'asc' },
                { doctor_availability: { start_time: 'asc' } }
            ]
        });
    }

    public async getUpcomingAppointments(today: Date, tomorrow: Date, doctorId?: number) {
        const whereClause: any = {
            appointment_date: { gte: today, lt: tomorrow },
            appointment_status_id: 4 // BOOKED
        };
        
        if (doctorId) {
            whereClause.doctor_staff_id = doctorId;
        }

        return this.prisma.appointment.findMany({
            where: whereClause,
            select: {
                appointment_id: true,
                doctor_staff_id: true,
                appointment_status: { select: { value_name: true } },
                patient: {
                    select: {
                        patient_id: true,
                        first_name: true,
                        last_name: true,
                        mobile_number: true,
                        is_account_complete: true,
                    }
                },
                doctor: {
                    select: {
                        first_name: true,
                        last_name: true,
                    }
                },
                visit_reason: { select: { value_name: true } },
                doctor_availability: {
                    select: {
                        start_time: true,
                        end_time: true,
                    }
                }
            },
            orderBy: { doctor_availability: { start_time: 'asc' } }
        });
    }

    public async getDoctorWithAppointments(doctorId: number, today: Date, tomorrow: Date) {
        return this.prisma.staff.findUnique({
            where: { staff_id: doctorId },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                doctor_profile: { select: { specialization: true } },
                doctor_appointments: {
                    where: {
                        appointment_date: { gte: today, lt: tomorrow },
                        queue: { is_active: true }
                    },
                    select: {
                        appointment_id: true,
                        appointment_status_id: true,
                        patient: {
                            select: {
                                patient_id: true,
                                first_name: true,
                                last_name: true,
                                mobile_number: true,
                                is_account_complete: true,
                            }
                        },
                        queue: {
                            select: {
                                queue_number: true,
                                queue_type: true,
                                created_at: true,
                            }
                        },
                        visit_reason: { select: { value_name: true } },
                        doctor_availability: {
                            select: {
                                start_time: true,
                                end_time: true,
                            }
                        }
                    },
                    orderBy: { queue: { joined_queue_at: 'asc' } }
                }
            }
        });
    }

    public async checkInPatientTx(appointmentId: number, createdByStaffId: number) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId }
            });

            if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found");
            if (appointment.appointment_status_id !== 4) throw new AppError(400, ErrorCode.BAD_REQUEST, "Appointment is not in BOOKED state");

            const updatedAppointment = await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: { appointment_status_id: 5 }
            });

            await tx.appointmentWorkflowHistory.create({
                data: {
                    appointment_id: appointmentId,
                    appointment_workflow_status_id: 5,
                    changed_by_staff_id: createdByStaffId,
                    remarks: "Patient Arrived.",
                }
            });

            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const lastQueue = await tx.queue.findFirst({
                where: {
                    appointment: {
                        doctor_staff_id: appointment.doctor_staff_id,
                        appointment_date: { gte: today, lt: tomorrow }
                    }
                },
                orderBy: { queue_number: 'desc' }
            });

            const nextQueueNumber = lastQueue ? lastQueue.queue_number + 1 : 1;

            const queue = await tx.queue.create({
                data: {
                    appointment_id: appointmentId,
                    queue_number: nextQueueNumber,
                    queue_type: QueueType.BOOKED,
                    joined_queue_at: new Date(),
                    joined_after_consultation_sequence: 0,
                    is_active: true
                }
            });

            return { appointment: updatedAppointment, queue };
        });
    }

    public async updateAppointmentStatusTx(appointmentId: number, targetStatusId: number, statusName: string, staffId: number) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId },
                include: { queue: true }
            });

            if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found");

            const updatedAppt = await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: { appointment_status_id: targetStatusId }
            });

            await tx.appointmentWorkflowHistory.create({
                data: {
                    appointment_id: appointmentId,
                    appointment_workflow_status_id: targetStatusId,
                    changed_by_staff_id: staffId,
                }
            });

            if (['completed', 'walked-out', 'cancelled'].includes(statusName) && appointment.queue) {
                await tx.queue.update({
                    where: { queue_id: appointment.queue.queue_id },
                    data: { is_active: false }
                });
            }

            return updatedAppt;
        });
    }
    public async getDailyStats(today: Date, tomorrow: Date) {
        const totalAppointments = await this.prisma.appointment.count({
            where: {
                appointment_date: { gte: today, lt: tomorrow },
            }
        });

        const remainingAppointments = await this.prisma.appointment.count({
            where: {
                appointment_date: { gte: today, lt: tomorrow },
                appointment_status_id: { notIn: [6, 7, 15] } // Not COMPLETED, CANCELLED, or WALKED_OUT
            }
        });

        return {
            totalAppointments,
            remainingAppointments
        };
    }
}
