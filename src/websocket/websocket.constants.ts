export enum SocketRoom {
    STAFF = "staff",
    ROLE = "role",
    SESSION = "session",
}

export enum SocketEvent {
    QUEUE_UPDATED = "queue.updated",
    NOTIFICATION_NEW = "notification.new",
    SCHEDULE_UPDATED = "schedule.updated",
    REPORT_UPDATED = "report.updated",
    ROLES_UPDATED = "staff.roles-updated",
    STAFF_UPDATED = "staff.updated",
    MAINTENANCE_MODE_CHANGED = "system.maintenance-mode-changed",
    SESSION_REVOKED = "session.revoked",
}

export enum UserRole {
    ADMIN = "admin",
    RECEPTIONIST = "receptionist",
    DOCTOR = "doctor",
    PHARMACIST = "pharmacist",
}