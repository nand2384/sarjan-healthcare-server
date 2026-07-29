import { RedisSessionData } from "@modules/session/session.types";

declare module "socket.io" {
    interface Socket {
        session: RedisSessionData;
    }
}