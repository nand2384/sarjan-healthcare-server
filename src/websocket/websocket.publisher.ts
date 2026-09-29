import { USER_ROLE } from "common/common.schema";
import { getWebSocketService } from "server.instance";
import { SocketEvent, SocketRoom } from "./websocket.constants";

export class WebSocketPublisher {
    /**
     * Emits a queue update event to receptionists (except the sender), and to
     * the specific doctor whose queue changed (except when they triggered it
     * themselves — e.g. completing their own consultation).
     * @param payload The queue data to send.
     * @param senderStaffId The staff ID of the user triggering the update.
     * @param doctorStaffId The staff ID of the specific doctor whose queue is updating.
     */
    static queueUpdated(payload: any, senderStaffId: number, doctorStaffId?: number): void {
        const websocketService = getWebSocketService();

        // 1. Broadcast to all receptionists EXCEPT the one who triggered this update
        websocketService.emitToRoleExcept(
            USER_ROLE.RECEPTIONIST,
            senderStaffId,
            SocketEvent.QUEUE_UPDATED,
            payload
        );

        // 2. Broadcast directly to the specific doctor, ONLY if they didn't trigger it themselves
        if (doctorStaffId && senderStaffId !== doctorStaffId) {
            websocketService.emitToStaff(
                doctorStaffId,
                SocketEvent.QUEUE_UPDATED,
                payload
            );
        }
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
     * Tells a staff member their role assignments changed, so their client
     * refetches `/auth/me` rather than keep acting on a stale role set.
     * Payload is intentionally empty — same pattern as `notificationCreated`.
     */
    static rolesUpdated(staffId: number): void {
        getWebSocketService().emitToStaff(staffId, SocketEvent.ROLES_UPDATED, {});
    }

    /**
     * Tells every other connected admin that a staff/doctor record changed
     * (created, edited, disabled, restored, unlocked, deleted, roles/level
     * changed, photo updated) so an open Staff/Doctor Management page can
     * refetch live instead of only reflecting the acting admin's own local
     * cache patch. Payload carries just the id — the client refetches, same
     * "server is the source of truth" pattern as `notificationCreated`.
     */
    static staffUpdated(staffId: number, actorStaffId: number): void {
        getWebSocketService().emitToRoleExcept(
            USER_ROLE.ADMIN,
            actorStaffId,
            SocketEvent.STAFF_UPDATED,
            { staffId }
        );
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

    /**
     * Tells a specific session's client it's been revoked (admin force-revoke,
     * "sign out other devices", or a staff-wide revoke) so it logs itself out
     * immediately instead of only discovering this on its next request.
     *
     * The transport is force-closed a couple seconds later as a fallback for
     * a connection that never acts on the event (no listener mounted,
     * backgrounded tab) — deliberately NOT immediate. `disconnectSockets`
     * closes the raw transport, which races the just-emitted event packet
     * over the same connection; closing first (or simultaneously) can win
     * that race and tear the socket down before the client ever receives the
     * event, and a server-initiated disconnect also disables socket.io's
     * client-side auto-reconnect by design — so a losing race leaves the
     * client stuck disconnected with the event lost. The delay gives the
     * primary event-driven path time to actually land first.
     */
    static sessionRevoked(sessionId: string): void {
        const websocketService = getWebSocketService();
        const room = `${SocketRoom.SESSION}:${sessionId}`;
        websocketService.emitToRoom(room, SocketEvent.SESSION_REVOKED, {});
        setTimeout(() => websocketService.disconnectRoom(room), 3000);
    }
}