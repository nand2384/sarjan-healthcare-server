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
    static queueUpdated(payload: any, senderStaffId: number, _doctorStaffId?: number): void {
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

    /**
     * Pings a staff member that a new visible notification exists for them.
     * Payload is intentionally empty — the client refetches from the DB,
     * which remains the source of truth.
     */
    static notificationCreated(staffId: number): void {
        getWebSocketService().emitToStaff(staffId, SocketEvent.NOTIFICATION_NEW, {});
    }

    /**
     * Notifies receptionists (except the sender) that a doctor's schedule/leave
     * changed, so the booking form and schedule-management views can refetch
     * rather than let someone book into a slot that was just edited or deleted.
     */
    static scheduleUpdated(doctorId: number, senderStaffId: number): void {
        getWebSocketService().emitToRoleExcept(
            USER_ROLE.RECEPTIONIST,
            senderStaffId,
            SocketEvent.SCHEDULE_UPDATED,
            { doctorId }
        );
    }

    /**
     * Tells each recipient's client that a specific report changed (new
     * message or status update) so an open Developer Dashboard table, "Your
     * Reports" list, or conversation view can refetch live — separate from
     * `notificationCreated`, which only pings the bell.
     */
    static reportUpdated(reportId: number, recipientStaffIds: number[]): void {
        const websocketService = getWebSocketService();
        recipientStaffIds.forEach((staffId) =>
            websocketService.emitToStaff(staffId, SocketEvent.REPORT_UPDATED, { reportId })
        );
    }

    /**
     * Tells a staff member their role assignments changed, so their client
     * refetches `/auth/me` rather than keep acting on a stale role set.
     * Payload is intentionally empty — same pattern as `notificationCreated`.
     */
    static rolesUpdated(staffId: number): void {
        getWebSocketService().emitToStaff(staffId, SocketEvent.ROLES_UPDATED, {});
    }

    /**
     * Broadcasts a maintenance-mode flip to every connected client, so
     * already-open tabs can show a banner before their next request 503s
     * (the middleware itself is the actual source of truth, this is just a
     * heads-up).
     */
    static maintenanceModeChanged(enabled: boolean): void {
        getWebSocketService().broadcast(SocketEvent.MAINTENANCE_MODE_CHANGED, { enabled });
    }
}