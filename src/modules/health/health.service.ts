import { checkDatabaseHealth } from "@database";
import { checkRedisHealth } from "@cache";

export class HealthService {
    public async checkHealth(): Promise<void> {
        await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
    }
}
