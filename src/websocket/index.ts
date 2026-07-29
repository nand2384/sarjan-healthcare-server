import { Server } from "socket.io";
import { AppContext } from "../app.context";
import { authenticateSocket } from "./websocket.auth";
import { assignRooms } from "./websocket.rooms";

export function setupWebSockets(
    io: Server,
    appContext: AppContext,
): void {
    io.use(async (socket, next) => {
        try {
            await authenticateSocket(socket, appContext);

            next();
        } catch (error) {
            next(error as Error);
        }
    });

    io.on("connection", (socket) => {
        assignRooms(socket);

        appContext.logger.info(
            {
                socketId: socket.id,
                staffId: socket.session.staff_id,
            },
            "WebSocket connected",
        );

        socket.on("disconnect", (reason: string) => {
            appContext.logger.info(
                {
                    socketId: socket.id,
                    staffId: socket.session.staff_id,
                    reason,
                },
                "WebSocket disconnected",
            );
        });
    });
}

export { WebSocketPublisher } from "./websocket.publisher";