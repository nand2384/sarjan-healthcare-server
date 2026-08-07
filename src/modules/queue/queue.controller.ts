import { Request, Response } from "express";
import { reminderQueue } from "../../queues/reminder.queue";
import { REMINDER_JOB_NAME } from "../../queues/reminder.worker";
import { EventLogService } from "@modules/event-log/event-log.service";

export class QueueController {
    constructor(private readonly eventLogService: EventLogService) {}

    public reminderStatus = async (_req: Request, res: Response) => {
        const [counts, recentFailures] = await Promise.all([
            reminderQueue.getJobCounts(),
            this.eventLogService.getRecentRunsForJob(REMINDER_JOB_NAME, 20),
        ]);

        return res.status(200).json({
            success: true,
            data: { counts, recentFailures },
        });
    };
}
