import { USER_ROLE } from "common/common.schema";
import { getWebSocketService } from "server.instance";
import { SocketEvent } from "./websocket.constants";

export class WebSocketPublisher {
    /**
     * Emits a queue update event to receptionists (except the sender).
     * @param payload The queue data to send.
     * @param senderStaffId The staff ID of the user triggering the update.
     * @param _doctorStaffId The staff ID of the specific doctor whose queue is updating (for future use).
     */
    static queueUpdated(payload: any, senderStaffId: number, _doctorStaffId: number): void {
        const websocketService = getWebSocketService();

        // 1. Broadcast to all receptionists EXCEPT the one who triggered this update
        websocketService.emitToRoleExcept(
            USER_ROLE.RECEPTIONIST,
            senderStaffId,
            SocketEvent.QUEUE_UPDATED,
            payload
        );

        // 2. Broadcast directly to the specific doctor, ONLY if they didn't trigger it themselves
        // TODO: Uncomment this when the doctor's dashboard is ready
        /*
        if (senderStaffId !== doctorStaffId) {
            websocketService.emitToStaff(
                doctorStaffId,
                SocketEvent.QUEUE_UPDATED,
                payload
            );
        }
        */
    }
}