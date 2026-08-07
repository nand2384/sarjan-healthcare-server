export enum SocketRoom {
    STAFF = "staff",
    ROLE = "role",
}

export enum SocketEvent {
    QUEUE_UPDATED = "queue.updated",
    NOTIFICATION_NEW = "notification.new",
    SCHEDULE_UPDATED = "schedule.updated",
    REPORT_UPDATED = "report.updated",
    ROLES_UPDATED = "staff.roles-updated",
    MAINTENANCE_MODE_CHANGED = "system.maintenance-mode-changed",
}

export enum UserRole {
    ADMIN = "admin",
    RECEPTIONIST = "receptionist",
    DOCTOR = "doctor",
    PHARMACIST = "pharmacist",
}