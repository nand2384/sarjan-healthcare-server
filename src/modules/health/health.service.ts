import { checkDatabaseHealth } from "@database";
import { checkRedisHealth } from "@cache";
import { env, buildInfo } from "@config";
import { EventLogService } from "@modules/event-log/event-log.service";

interface CheckResult {
    status: "up" | "down";
    latencyMs: number;
}

export class HealthService {
    constructor(private readonly eventLogService: EventLogService) {}

    public async checkHealth(): Promise<{ database: CheckResult; redis: CheckResult; overallStatus: "healthy" | "degraded" }> {
        const [database, redis] = await Promise.all([this.timedCheck(() => checkDatabaseHealth()), this.timedCheck(async () => {
            await checkRedisHealth();
            return true;
        })]);

        const overallStatus = database.status === "up" && redis.status === "up" ? "healthy" : "degraded";

        return { database, redis, overallStatus };
    }

    public async getJobStatuses() {
        return this.eventLogService.getLatestPerJob();
    }

    /** Recent runs for one specific job (by its subject/job_name) — powers the "view history" drill-down from the System Health scheduled-jobs table. */
    public async getJobHistory(jobName: string, limit = 20) {
        return this.eventLogService.getRecentRunsForJob(jobName, limit);
    }

    public getVersionInfo() {
        return {
            version: env.APP_VERSION ?? buildInfo.fallbackVersion,
            commit: env.GIT_COMMIT_SHA ?? buildInfo.fallbackCommit,
        };
    }

    private async timedCheck(check: () => Promise<boolean>): Promise<CheckResult> {
        const start = Date.now();
        try {
            const ok = await check();
            return { status: ok ? "up" : "down", latencyMs: Date.now() - start };
        } catch {
            return { status: "down", latencyMs: Date.now() - start };
        }
    }
}
