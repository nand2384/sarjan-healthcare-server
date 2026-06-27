import app from "./app";
import { env } from "./config/env";
import { appContext } from "./app.context";

import { connectDatabase } from "./database";
import { shutdown } from "./shutdown";

async function startServer() {
    await connectDatabase();

    app.listen(env.PORT, () => {
        appContext.logger.info(`Server is running on port ${env.PORT}`);
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

startServer();
