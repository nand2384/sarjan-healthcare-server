import { Server } from "socket.io";
import { SocketRoom } from "./websocket.constants";

export class WebSocketService {
    constructor(private readonly io: Server) {}

    emitToStaff<T>(staffId: number, event: string, payload: T): void {
        this.io.to(`${SocketRoom.STAFF}:${staffId}`).emit(event, payload);
    }

    emitToRole<T>(role: string, event: string, payload: T): void {
        this.io.to(`${SocketRoom.ROLE}:${role}`).emit(event, payload);
    }

    emitToRoleExcept<T>(role: string, exceptStaffId: number, event: string, payload: T): void {
        this.io
            .to(`${SocketRoom.ROLE}:${role}`)
            .except(`${SocketRoom.STAFF}:${exceptStaffId}`)
            .emit(event, payload);
    }

    emitToRoom<T>(room: string, event: string, payload: T): void {
        this.io.to(room).emit(event, payload);
    }

    /** Forcibly closes the underlying transport for every socket in a room — used alongside an emit so a revoked session can't keep working even if the client doesn't act on the event. */
    disconnectRoom(room: string): void {
        this.io.in(room).disconnectSockets(true);
    }

    broadcast<T>(event: string, payload: T): void {
        this.io.emit(event, payload);
    }
}