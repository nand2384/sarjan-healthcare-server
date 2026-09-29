import { redisClient } from "@cache";
import { prisma } from "@database";
import { logger } from "@logger";

import { AuthService, AuthRepository } from "@modules/auth";
import { SessionRepository, SessionService } from "@modules/session";
import { HealthService } from "@modules/health";
import { StaffService } from "@modules/staff/staff.service";
import { StaffRepository } from "@modules/staff/staff.repository";
import { StaffRoleRepository } from "@modules/staff-role/staff-role.repository";
import { AuditRepository } from "@modules/audit/audit.repository";
import { AuditService } from "@modules/audit/audit.service";
import { MailerService } from "mailer";
import { MasterRepository } from "@modules/master/master.repository";
import { MasterService } from "@modules/master/master.service";
import { DoctorRepository } from "@modules/doctor/doctor.repository";
import { DoctorService } from "@modules/doctor/doctor.service";
import { PasskeyRepository } from "@modules/passkey/passkey.repository";
import { PasskeyService } from "@modules/passkey/passkey.service";
import { PatientRepository } from "@modules/patient/patient.repository";
import { PatientService } from "@modules/patient/patient.service";
import { PatientOtpRepository } from "@modules/patient/patient-otp.repository";
import { PatientOtpService } from "@modules/patient/patient-otp.service";
import { ReceptionistRepository } from "@modules/receptionist/receptionist.repository";
import { ReceptionistService } from "@modules/receptionist/receptionist.service";
import { NotificationRepository } from "@modules/notification/notification.repository";
import { NotificationService } from "@modules/notification/notification.service";
import { BillingRepository } from "@modules/billing/billing.repository";
import { BillingService } from "@modules/billing/billing.service";
import { FinanceRepository } from "@modules/finance/finance.repository";
import { FinanceService } from "@modules/finance/finance.service";
import { AnnouncementRepository } from "@modules/announcement/announcement.repository";
import { AnnouncementService } from "@modules/announcement/announcement.service";
import { SystemSettingRepository } from "@modules/system-setting/system-setting.repository";
import { SystemSettingService } from "@modules/system-setting/system-setting.service";
import { ReportRepository } from "@modules/report/report.repository";
import { ReportService } from "@modules/report/report.service";
import { EventLogRepository } from "@modules/event-log/event-log.repository";
import { EventLogService } from "@modules/event-log/event-log.service";
import { ReviewCriterionRepository } from "@modules/review-criterion/review-criterion.repository";
import { ReviewCriterionService } from "@modules/review-criterion/review-criterion.service";
import { ReviewRepository } from "@modules/review/review.repository";
import { ReviewService } from "@modules/review/review.service";
import { StorageService } from "@modules/storage/storage.service";
import { LabRepository } from "@modules/lab/lab.repository";
import { LabService } from "@modules/lab/lab.service";
import { ReferralRepository } from "@modules/referral/referral.repository";
import { ReferralService } from "@modules/referral/referral.service";
import { CatalogRepository } from "@modules/catalog/catalog.repository";
import { CatalogService } from "@modules/catalog/catalog.service";
import { ConsultationRepository } from "@modules/consultation/consultation.repository";
import { ConsultationService } from "@modules/consultation/consultation.service";
import { ClinicProfileRepository } from "@modules/clinic-profile/clinic-profile.repository";
import { ClinicProfileService } from "@modules/clinic-profile/clinic-profile.service";
import { VideoCategoryRepository } from "@modules/video-category/video-category.repository";
import { VideoCategoryService } from "@modules/video-category/video-category.service";
import { VideoRepository } from "@modules/video/video.repository";
import { VideoService } from "@modules/video/video.service";
import { WhatsAppService } from "whatsapp";

const auditRepository = new AuditRepository(prisma);
const auditService = new AuditService(auditRepository);

const eventLogRepository = new EventLogRepository(prisma);
const eventLogService = new EventLogService(eventLogRepository);

const mailerService = new MailerService(eventLogService);
const whatsAppService = new WhatsAppService(eventLogService);

const sessionRepository = new SessionRepository(prisma);
const sessionService = new SessionService(sessionRepository, redisClient, auditService);

const staffRepository = new StaffRepository(prisma);

const systemSettingRepository = new SystemSettingRepository(prisma);
const systemSettingService = new SystemSettingService(systemSettingRepository, redisClient, auditService);

const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository, sessionService, mailerService, staffRepository, auditService, systemSettingService);

const healthService = new HealthService(eventLogService);

const staffRoleRepository = new StaffRoleRepository(prisma);

const masterRepository = new MasterRepository(prisma);
const masterService = new MasterService(masterRepository, redisClient, auditService);

const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);

const reviewCriterionRepository = new ReviewCriterionRepository(prisma);
const reviewCriterionService = new ReviewCriterionService(reviewCriterionRepository);

const storageService = new StorageService();

const clinicProfileRepository = new ClinicProfileRepository(prisma);
const clinicProfileService = new ClinicProfileService(clinicProfileRepository);

const videoCategoryRepository = new VideoCategoryRepository(prisma);
const videoCategoryService = new VideoCategoryService(videoCategoryRepository);

const videoRepository = new VideoRepository(prisma);
const videoService = new VideoService(videoRepository);

const reviewRepository = new ReviewRepository(prisma);
const reviewService = new ReviewService(reviewRepository, reviewCriterionService, systemSettingService, staffRepository, notificationService);

const staffService = new StaffService(prisma, staffRepository, staffRoleRepository, masterRepository, auditService, mailerService, authService, notificationService, sessionService);

const doctorRepository = new DoctorRepository(prisma);
const doctorService = new DoctorService(prisma, doctorRepository, staffRepository, staffRoleRepository, auditService, mailerService, storageService);

const patientOtpRepository = new PatientOtpRepository(prisma);
const patientOtpService = new PatientOtpService(patientOtpRepository, whatsAppService);

const patientRepository = new PatientRepository(prisma);
const patientService = new PatientService(patientRepository, systemSettingService, patientOtpService);

const passkeyRepository = new PasskeyRepository(prisma);
const passkeyService = new PasskeyService(passkeyRepository, authRepository, sessionService);

const billingRepository = new BillingRepository(prisma);
const billingService = new BillingService(billingRepository, auditService, mailerService);

const receptionistRepository = new ReceptionistRepository(prisma);
const receptionistService = new ReceptionistService(receptionistRepository, billingRepository, billingService, systemSettingService, whatsAppService, reviewService);

const financeRepository = new FinanceRepository(prisma);
const financeService = new FinanceService(financeRepository);

const announcementRepository = new AnnouncementRepository(prisma);
const announcementService = new AnnouncementService(prisma, announcementRepository, staffRepository, notificationRepository, notificationService, mailerService);

const reportRepository = new ReportRepository(prisma);
const reportService = new ReportService(reportRepository, mailerService);

const labRepository = new LabRepository(prisma);
const labService = new LabService(labRepository);

const referralRepository = new ReferralRepository(prisma);
const referralService = new ReferralService(referralRepository);

const catalogRepository = new CatalogRepository(prisma);
const catalogService = new CatalogService(catalogRepository);

const consultationRepository = new ConsultationRepository(prisma);
const consultationService = new ConsultationService(consultationRepository, referralRepository, referralService, catalogService, receptionistService);

export const appContext = Object.freeze({
    logger,
    prisma,
    redisClient,

    services: {
        auditService,
        masterService,
        authService,
        healthService,
        sessionService,
        staffService,
        doctorService,
        patientService,
        patientOtpService,
        mailerService,
        passkeyService,
        receptionistService,
        notificationService,
        billingService,
        financeService,
        announcementService,
        systemSettingService,
        reportService,
        whatsAppService,
        eventLogService,
        reviewCriterionService,
        reviewService,
        storageService,
        clinicProfileService,
        videoCategoryService,
        videoService,
        labService,
        referralService,
        catalogService,
        consultationService,
    },
});

export type AppContext = typeof appContext;
