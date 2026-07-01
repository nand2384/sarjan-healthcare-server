import cron from "node-cron";

export function schedule(expression: string, task: () => Promise<void> | void) {
    return cron.schedule(expression, task, {
        timezone: "Asia/Kolkata",
    });
}
