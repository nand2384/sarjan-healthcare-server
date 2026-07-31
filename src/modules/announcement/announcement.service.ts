import { AnnouncementTargetType, Prisma, PrismaClient } from "@generated/prisma/client";
import { AnnouncementRepository } from "./announcement.repository";
import { StaffRepository } from "@modules/staff/staff.repository";
import { NotificationRepository } from "@modules/notification/notification.repository";
import { NotificationService } from "@modules/notification/notification.service";
import { MailerService } from "mailer";
import { CreateAnnouncementSchema } from "./announcement.schema";
import { AppError, ErrorCode } from "@errors";
import { logger } from "@logger";

interface Recipient {
    staff_id: number;
    email: string;
    first_name: string;
}

export class AnnouncementService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly announcementRepository: AnnouncementRepository,
        private readonly staffRepository: StaffRepository,
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationService: NotificationService,
        private readonly mailerService: MailerService,
    ) {}

    private async resolveRecipients(dto: CreateAnnouncementSchema, actorStaffId: number, tx: Prisma.TransactionClient): Promise<Recipient[]> {
        if (dto.target_type === AnnouncementTargetType.STAFF) {
            const staff = await this.staffRepository.findById(dto.target_staff_id!, tx);
            if (!staff) {
                throw new AppError(404, ErrorCode.NOT_FOUND, "Target staff member not found");
            }
            return [{ staff_id: staff.staff_id, email: staff.email, first_name: staff.first_name }];
        }

        if (dto.target_type === AnnouncementTargetType.ROLE) {
            return this.staffRepository.getActiveStaffIdsByRole(dto.target_role_id!, actorStaffId, tx);
        }

        return this.staffRepository.getAllActiveStaffIds(actorStaffId, tx);
    }

    public async publish(dto: CreateAnnouncementSchema, actorStaffId: number) {
        let recipients: Recipient[] = [];

        const announcement = await this.prisma.$transaction(async (tx) => {
            const created = await this.announcementRepository.create({
                message: dto.message,
                type: dto.type,
                target_type: dto.target_type,
                target_staff_id: dto.target_staff_id,
                target_role_id: dto.target_role_id,
                email_sent: dto.send_email,
                created_by_staff_id: actorStaffId,
            }, tx);

            recipients = await this.resolveRecipients(dto, actorStaffId, tx);

            await Promise.all(recipients.map((recipient) =>
                this.notificationService.notify(recipient.staff_id, {
                    title: "Announcement",
                    message: dto.message,
                    type: dto.type.toUpperCase(),
                    action_url: null,
                    announcement_id: created.announcement_id,
                }, tx)
            ));

            return created;
        });

        // Post-commit: live-ping every recipient's bell
        recipients.forEach((recipient) => this.notificationService.pingNew(recipient.staff_id));

        // Post-commit: optional email fan-out, fire-and-forget
        if (dto.send_email) {
            recipients.forEach((recipient) => {
                this.mailerService.sendAnnouncementMail({
                    to: recipient.email,
                    firstName: recipient.first_name,
                    message: dto.message,
                    type: dto.type,
                }).catch((error) => logger.error({ err: error }, `Failed to send announcement email to staff ${recipient.staff_id}`));
            });
        }

        return announcement;
    }

    public async list(page: number, limit: number) {
        const { rows, total } = await this.announcementRepository.getActive(page, limit);
        return { rows, total, page, limit };
    }

    /**
     * Withdraws an announcement and retracts every delivered copy from recipients'
     * notification lists. The Announcement row itself is kept (is_active=false,
     * withdrawn_at set) as the record that it was sent and later pulled.
     */
    public async withdraw(announcementId: number) {
        let affectedStaffIds: number[] = [];

        await this.prisma.$transaction(async (tx) => {
            const result = await this.announcementRepository.withdraw(announcementId, tx);

            if (result.count === 0) {
                throw new AppError(404, ErrorCode.NOT_FOUND, "Announcement not found or already withdrawn");
            }

            affectedStaffIds = await this.notificationRepository.getRecipientIdsByAnnouncementId(announcementId, tx);
            await this.notificationRepository.deleteByAnnouncementId(announcementId, tx);
        });

        // Post-commit: refresh every affected recipient's bell so the retraction lands live
        affectedStaffIds.forEach((staffId) => this.notificationService.pingNew(staffId));

        return { success: true, retracted_from: affectedStaffIds.length };
    }
}
