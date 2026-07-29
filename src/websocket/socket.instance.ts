import { Server } from "socket.io";

let io: Server;

export function setSocketServer(server: Server): void {
    io = server;
}

export function getSocketServer(): Server {
    return io;
}