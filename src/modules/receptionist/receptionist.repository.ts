import { PrismaClient, QueueType } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";

export interface AppointmentHistoryFilters {
    startDate: Date;
    endDate: Date;
    doctorId?: number;
    queueType?: 'BOOKED' | 'WALK_IN';
    status?: 'completed' | 'walked-out' | 'cancelled';
    search?: string;
    page: number;
    limit: number;
}

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
                        appointment_status: { select: { value_name: true } },
                        patient: {
                            select: {
                                patient_id: true,
                                first_name: true,
                                middle_name: true,
                                last_name: true,
                                mobile_number: true,
                                is_account_complete: true,
                            }
                        },
                        visit_reason: { select: { value_name: true } },
                        doctor_availability: {
                            select: {
                                start_time: true,
                                end_time: true,
                            }
                        },
                        queue: {
                            select: {
                                queue_number: true,
                                queue_type: true,
                                joined_queue_at: true,
                                skip_count: true,
                            }
                        },
                        appointment_workflow_history: {
                            select: { created_at: true },
                            orderBy: { created_at: 'desc' },
                            take: 1
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
                appointment_date: { gte: today, lte: tomorrow },
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

    public async getUpcomingAppointments(today: Date, tomorrow?: Date, doctorId?: number) {
        const whereClause: any = {
            appointment_date: tomorrow ? { gte: today, lt: tomorrow } : { gte: today },
            appointment_status_id: 4 // BOOKED
        };

        if (doctorId) {
            whereClause.doctor_staff_id = doctorId;
        }

        return this.prisma.appointment.findMany({
            where: whereClause,
            select: {
                appointment_id: true,
                appointment_date: true,
                doctor_staff_id: true,
                appointment_status: { select: { value_name: true } },
                patient: {
                    select: {
                        patient_id: true,
                        first_name: true,
                        middle_name: true,
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
            orderBy: [
                { appointment_date: 'asc' },
                { doctor_availability: { start_time: 'asc' } }
            ]
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
                        appointment_status: { select: { value_name: true } },
                        patient: {
                            select: {
                                patient_id: true,
                                first_name: true,
                                middle_name: true,
                                last_name: true,
                                mobile_number: true,
                                is_account_complete: true,
                            }
                        },
                        queue: {
                            select: {
                                queue_number: true,
                                queue_type: true,
                                joined_queue_at: true,
                                skip_count: true,
                            }
                        },
                        appointment_workflow_history: {
                            select: { created_at: true },
                            orderBy: { created_at: 'desc' },
                            take: 1
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
                where: { appointment_id: appointmentId },
                include: { queue: true }
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

            // If queue already exists, reuse it; otherwise create new queue entry
            let queue = appointment.queue;
            if (!queue) {
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

                queue = await tx.queue.create({
                    data: {
                        appointment_id: appointmentId,
                        queue_number: nextQueueNumber,
                        queue_type: QueueType.BOOKED,
                        joined_queue_at: new Date(),
                        joined_after_consultation_sequence: 0,
                        is_active: true
                    }
                });
            }

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

            // A BOOKED patient starting consultation counts as being "let ahead of"
            // every walk-in still waiting for this doctor today — age them by one.
            if (targetStatusId === 12 && appointment.queue?.queue_type === QueueType.BOOKED) {
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                await tx.queue.updateMany({
                    where: {
                        queue_type: QueueType.WALK_IN,
                        is_active: true,
                        appointment: {
                            doctor_staff_id: appointment.doctor_staff_id,
                            appointment_date: { gte: today, lt: tomorrow },
                            appointment_status_id: 5 // CHECKED_IN, still waiting
                        }
                    },
                    data: { skip_count: { increment: 1 } }
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

    // --- Appointment History (Phase 6) ---

    public async getAppointmentHistory(filters: AppointmentHistoryFilters) {
        const statusIdMap: Record<string, number> = { completed: 6, 'walked-out': 15, cancelled: 7 };

        const where: any = {
            appointment_date: { gte: filters.startDate, lte: filters.endDate },
            appointment_status_id: filters.status ? statusIdMap[filters.status] : { in: [6, 15, 7] },
        };

        if (filters.doctorId) where.doctor_staff_id = filters.doctorId;
        if (filters.queueType) where.queue = { queue_type: filters.queueType };
        if (filters.search) {
            where.patient = {
                OR: [
                    { first_name: { contains: filters.search, mode: 'insensitive' } },
                    { last_name: { contains: filters.search, mode: 'insensitive' } },
                    { mobile_number: { contains: filters.search } },
                ]
            };
        }

        const [rows, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                orderBy: { appointment_date: 'desc' },
                skip: (filters.page - 1) * filters.limit,
                take: filters.limit,
                select: {
                    appointment_id: true,
                    appointment_date: true,
                    appointment_status_id: true,
                    patient: {
                        select: { patient_id: true, first_name: true, middle_name: true, last_name: true, mobile_number: true }
                    },
                    doctor: { select: { first_name: true, last_name: true } },
                    queue: { select: { queue_type: true } },
                    payment: {
                        select: { total_amount: true, payment_method: true, receipt_no: true, consultation_fee_type: true }
                    },
                    test_orders: { select: { test_order_id: true } },
                }
            }),
            this.prisma.appointment.count({ where })
        ]);

        return { rows, total };
    }

    public async getAppointmentHistorySummary(startDate: Date, endDate: Date) {
        const where = {
            appointment_date: { gte: startDate, lte: endDate },
            appointment_status_id: { in: [6, 15, 7] }, // COMPLETED, WALKED_OUT, CANCELLED
        };

        const [totalVisits, walkInCount, bookedCount, payments] = await Promise.all([
            this.prisma.appointment.count({ where }),
            this.prisma.appointment.count({ where: { ...where, queue: { queue_type: QueueType.WALK_IN } } }),
            this.prisma.appointment.count({ where: { ...where, queue: { queue_type: QueueType.BOOKED } } }),
            this.prisma.payment.findMany({
                where: { paid_at: { gte: startDate, lte: endDate } },
                select: { total_amount: true, consultation_fee_type: true }
            })
        ]);

        const totalCollected = payments.reduce((sum, p) => sum + Number(p.total_amount), 0);
        const newPatientCount = payments.filter(p => p.consultation_fee_type === 'NEW').length;
        const returningPatientCount = payments.filter(p => p.consultation_fee_type === 'OLD').length;

        return { totalVisits, walkInCount, bookedCount, totalCollected, newPatientCount, returningPatientCount };
    }
}
