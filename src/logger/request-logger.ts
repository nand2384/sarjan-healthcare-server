import { logger } from "./index";

export function createRequestLogger(requestId: string) {
    return logger.child({
        requestId,
    });
}
