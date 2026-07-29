import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { WebSocketService } from "websocket/websocket.service";

let httpServer: HttpServer | null = null;
let socketServer: SocketIOServer | null = null;
let websocketService: WebSocketService | null = null;

export function setHttpServer(server: HttpServer): void {
    httpServer = server;
}

export function getHttpServer(): HttpServer | null {
    return httpServer;
}

export function setSocketServer(server: SocketIOServer): void {
    socketServer = server;
}

export function getSocketServer(): SocketIOServer | null {
    return socketServer;
}

export function setWebSocketService(service: WebSocketService): void {
    websocketService = service;
}

export function getWebSocketService(): WebSocketService {
    if(!websocketService) {
        throw new Error("WebSocketService not initialized.");
    }

    return websocketService;
}