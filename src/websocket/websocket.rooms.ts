import { Socket } from "socket.io";
import { SocketRoom } from "./websocket.constants";

export function assignRooms(socket: Socket): void {
    socket.join(`${SocketRoom.STAFF}:${socket.session.staff_id}`);
    socket.join(`${SocketRoom.SESSION}:${socket.session.session_id}`);

    for (const role of socket.session.roles) {
        socket.join(`${SocketRoom.ROLE}:${role}`);
    }
}