import { AuditAction, AuditEntityType, PrismaClient } from "@generated/prisma/client";
import { ReleaseNoteRepository, CreateReleaseNoteData, GetReleaseNotesFilters } from "./release-note.repository";
import { AuditService } from "@modules/audit/audit.service";
import { StaffRepository } from "@modules/staff/staff.repository";
import { NotificationService } from "@modules/notification/notification.service";

export class ReleaseNoteService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly releaseNoteRepository: ReleaseNoteRepository,
        private readonly auditService: AuditService,
        private readonly staffRepository: StaffRepository,
        private readonly notificationService: NotificationService,
    ) {}

    /**
     * Delivery is a plain bell notification (not a forced modal) — every
     * active staff member except the publisher gets a Notification row +
     * a live socket ping, same fan-out shape as AnnouncementService.publish().
     * Read/unread state is tracked by the existing Notification.is_read
     * column, so there's no separate "seen" bookkeeping to maintain here.
     */
    public async create(data: CreateReleaseNoteData, auditContext: { performed_by_staff_id: number; ip_address?: string; user_agent?: string }) {
        let recipients: { staff_id: number }[] = [];

        const note = await this.prisma.$transaction(async (tx) => {
            const created = await this.releaseNoteRepository.create(data, tx);

            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.RELEASE_NOTE,
                entity_id: created.release_note_id.toString(),
                action: AuditAction.CREATE,
                new_values: { version_label: created.version_label, title: created.title },
            }, tx);

            recipients = await this.staffRepository.getAllActiveStaffIds(data.created_by_staff_id, tx);

            await Promise.all(recipients.map((recipient) =>
                this.notificationService.notify(recipient.staff_id, {
                    title: `${created.title} (${created.version_label})`,
                    message: created.body,
                    type: "INFO",
                    action_url: `/release-notes/${created.release_note_id}`,
                }, tx)
            ));

            return created;
        });

        // Post-commit: live-ping every recipient's bell
        recipients.forEach((recipient) => this.notificationService.pingNew(recipient.staff_id));

        return note;
    }

    public async getReleaseNotes(filters: GetReleaseNotesFilters) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;

        const [notes, total] = await Promise.all([
            this.releaseNoteRepository.findMany(filters),
            this.releaseNoteRepository.count(),
        ]);

        return {
            data: notes,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}
