import { createServer } from "http";

import app from "./app";
import { appContext } from "./app.context";
import { env } from "./config/env";
import { connectDatabase } from "./database";
import { redisClient } from "@cache";
import { startSessionCleanupJob, startNotificationCleanupJob, startAppointmentReminderSweepJob, startDoctorShiftNoticeJob, startMonitoringLogCleanupJob } from "@scheduler";
import { startReminderWorker } from "./queues/reminder.worker";
import { shutdown } from "./shutdown";
import { setupWebSockets } from "./websocket";
import { setHttpServer, setSocketServer, setWebSocketService } from "./server.instance";

import { Server as SocketIOServer } from "socket.io";
import { WebSocketService } from "websocket/websocket.service";

async function startServer(): Promise<void> {
    await connectDatabase();
    await redisClient.connect();

    startSessionCleanupJob();
    startNotificationCleanupJob();
    startAppointmentReminderSweepJob();
    startDoctorShiftNoticeJob();
    startMonitoringLogCleanupJob();
    startReminderWorker();

    const httpServer = createServer(app);

    setHttpServer(httpServer);

    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            credentials: true,
        },
    });
    
    const websocketService = new WebSocketService(io);
    setWebSocketService(websocketService);

    setSocketServer(io);

    setupWebSockets(io, appContext);

    httpServer.listen(env.PORT, () => {
        appContext.logger.info(
            `Server is running on port ${env.PORT}`,
        );
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

void startServer();