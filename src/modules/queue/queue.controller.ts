import { Request, Response } from "express";
import { reminderQueue } from "../../queues/reminder.queue";
import { REMINDER_JOB_NAME } from "../../queues/reminder.worker";
import { noShowQueue } from "../../queues/no-show.queue";
import { NO_SHOW_JOB_NAME } from "../../queues/no-show.worker";
import { EventLogService } from "@modules/event-log/event-log.service";

export class QueueController {
    constructor(private readonly eventLogService: EventLogService) {}

    public status = async (_req: Request, res: Response) => {
        const [reminderCounts, reminderFailures, noShowCounts, noShowFailures] = await Promise.all([
            reminderQueue.getJobCounts(),
            this.eventLogService.getRecentRunsForJob(REMINDER_JOB_NAME, 20),
            noShowQueue.getJobCounts(),
            this.eventLogService.getRecentRunsForJob(NO_SHOW_JOB_NAME, 20),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                reminder: { counts: reminderCounts, recentFailures: reminderFailures },
                noShow: { counts: noShowCounts, recentFailures: noShowFailures },
            },
        });
    };
}
