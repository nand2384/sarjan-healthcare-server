import { PrismaClient, QueueType } from "@generated/prisma/client";
import { AppError, ErrorCode } from "@errors";
import { logger } from "@logger";
import { cancelReminder } from "../../queues/reminder.queue";
import { cancelNoShowCheck } from "../../queues/no-show.queue";
import { getAppointmentStartInstantUTC, getAppointmentEndInstantUTC, getTodayAsAppointmentDateUTC } from "utils/appointment-time.util";

export interface AppointmentHistoryFilters {
    startDate: Date;
    endDate: Date;
    doctorId?: number;
    queueType?: 'BOOKED' | 'WALK_IN';
    status?: 'completed' | 'walked-out' | 'cancelled' | 'no-show';
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
                        whatsapp_number: true,
                        is_account_complete: true,
                    }
                },
                doctor: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
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

    public async checkInPatientTx(appointmentId: number, createdByStaffId: number, checkInWindowHours: number) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId },
                include: { queue: true, doctor_availability: true }
            });

            if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found");
            if (appointment.appointment_status_id !== 4) throw new AppError(400, ErrorCode.BAD_REQUEST, "Appointment is not in BOOKED state");

            // Scheduled (non-walk-in) appointments only — walk-ins have no
            // doctor_availability and are created already CHECKED_IN, so they
            // never reach this guard.
            if (appointment.doctor_availability) {
                const opensAt = new Date(
                    getAppointmentStartInstantUTC(appointment.appointment_date, appointment.doctor_availability.start_time).getTime()
                    - checkInWindowHours * 60 * 60 * 1000
                );
                const closesAt = getAppointmentEndInstantUTC(appointment.appointment_date, appointment.doctor_availability.end_time);
                const now = new Date();
                if (now < opensAt || now > closesAt) {
                    throw new AppError(400, ErrorCode.BAD_REQUEST, "Check-in is only available within the appointment's slot window");
                }
            }

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
        }).then(async (result) => {
            await cancelNoShowCheck(appointmentId).catch((error) =>
                logger.error({ err: error, appointmentId }, "Failed to cancel appointment no-show check job")
            );
            return result;
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
        }).then(async (updatedAppt) => {
            if (targetStatusId === 7) {
                await cancelReminder(appointmentId).catch((error) =>
                    logger.error({ err: error, appointmentId }, "Failed to cancel appointment reminder job")
                );
                await cancelNoShowCheck(appointmentId).catch((error) =>
                    logger.error({ err: error, appointmentId }, "Failed to cancel appointment no-show check job")
                );
            }
            return updatedAppt;
        });
    }
    /**
     * One-time, in-place reschedule: same appointment_id, new date/slot,
     * reschedule_count incremented. All authoritative validation happens
     * inside the transaction (not just the service layer) to close the race
     * where two requests hit this concurrently.
     */
    public async rescheduleAppointmentTx(
        appointmentId: number,
        newDoctorAvailabilityId: number,
        newAppointmentDate: Date,
        staffId: number,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId },
                include: { doctor_availability: true },
            });

            if (!appointment) throw new AppError(404, ErrorCode.NOT_FOUND, "Appointment not found");
            if (appointment.appointment_status_id !== 4) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "Only BOOKED appointments can be rescheduled");
            }
            if (appointment.reschedule_count >= 1) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "This appointment has already been rescheduled once");
            }

            const todayIST = getTodayAsAppointmentDateUTC();
            if (todayIST >= appointment.appointment_date) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "Cannot reschedule on or after the appointment's date — cancel it instead");
            }

            const oldSlotLabel = appointment.doctor_availability
                ? `${appointment.appointment_date.toISOString().slice(0, 10)} (${appointment.doctor_availability.slot_name})`
                : appointment.appointment_date.toISOString().slice(0, 10);

            const updatedAppointment = await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: {
                    appointment_date: newAppointmentDate,
                    doctor_availability_id: newDoctorAvailabilityId,
                    reschedule_count: { increment: 1 },
                },
                include: { doctor_availability: true, patient: true, doctor: true },
            });

            const newSlotLabel = updatedAppointment.doctor_availability
                ? `${updatedAppointment.appointment_date.toISOString().slice(0, 10)} (${updatedAppointment.doctor_availability.slot_name})`
                : updatedAppointment.appointment_date.toISOString().slice(0, 10);

            await tx.appointmentWorkflowHistory.create({
                data: {
                    appointment_id: appointmentId,
                    appointment_workflow_status_id: 4, // BOOKED — reaffirmed, not a status change
                    changed_by_staff_id: staffId,
                    remarks: `Rescheduled from ${oldSlotLabel} to ${newSlotLabel}.`,
                },
            });

            return updatedAppointment;
        }).then(async (updatedAppointment) => {
            await cancelNoShowCheck(appointmentId).catch((error) =>
                logger.error({ err: error, appointmentId }, "Failed to cancel old-slot no-show check job on reschedule")
            );
            await cancelReminder(appointmentId).catch((error) =>
                logger.error({ err: error, appointmentId }, "Failed to cancel old-slot reminder job on reschedule")
            );
            return updatedAppointment;
        });
    }

    /**
     * Fired by the delayed no-show queue job at slot-end. Re-checks status is
     * still BOOKED (4) at fire time — the appointment may have been checked
     * in, cancelled, or rescheduled between enqueue and fire — and is a no-op
     * otherwise. Deactivates (not deletes) any Queue row pre-created at
     * booking time but never actually used, same convention as the
     * cancelled/completed/walked-out branch above.
     */
    public async markNoShowIfStillBookedTx(appointmentId: number) {
        return this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { appointment_id: appointmentId },
                include: { queue: true }
            });

            if (!appointment || appointment.appointment_status_id !== 4) {
                return null;
            }

            const updatedAppt = await tx.appointment.update({
                where: { appointment_id: appointmentId },
                data: { appointment_status_id: 16 } // NO_SHOW
            });

            await tx.appointmentWorkflowHistory.create({
                data: {
                    appointment_id: appointmentId,
                    appointment_workflow_status_id: 16,
                    changed_by_staff_id: appointment.created_by_staff_id,
                    remarks: "Patient did not check in before the appointment slot ended.",
                }
            });

            if (appointment.queue) {
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
                appointment_status_id: { notIn: [6, 7, 15, 16] } // Not COMPLETED, CANCELLED, WALKED_OUT, or NO_SHOW
            }
        });

        return {
            totalAppointments,
            remainingAppointments
        };
    }

    // --- Appointment History (Phase 6) ---

    public async getAppointmentHistory(filters: AppointmentHistoryFilters) {
        const statusIdMap: Record<string, number> = { completed: 6, 'walked-out': 15, cancelled: 7, 'no-show': 16 };

        const where: any = {
            appointment_date: { gte: filters.startDate, lte: filters.endDate },
            appointment_status_id: filters.status ? statusIdMap[filters.status] : { in: [6, 15, 7, 16] },
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
            appointment_status_id: { in: [6, 15, 7, 16] }, // COMPLETED, WALKED_OUT, CANCELLED, NO_SHOW
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
