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
import { ReceptionistRepository } from "@modules/receptionist/receptionist.repository";
import { ReceptionistService } from "@modules/receptionist/receptionist.service";
import { NotificationRepository } from "@modules/notification/notification.repository";
import { NotificationService } from "@modules/notification/notification.service";
import { BillingRepository } from "@modules/billing/billing.repository";
import { BillingService } from "@modules/billing/billing.service";
import { FinanceRepository } from "@modules/finance/finance.repository";
import { FinanceService } from "@modules/finance/finance.service";

const auditRepository = new AuditRepository(prisma);
const auditService = new AuditService(auditRepository);

const mailerService = new MailerService();

const sessionRepository = new SessionRepository(prisma);
const sessionService = new SessionService(sessionRepository, redisClient);

const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository, sessionService, mailerService);

const healthService = new HealthService();

const staffRoleRepository = new StaffRoleRepository(prisma);

const masterRepository = new MasterRepository(prisma);
const masterService = new MasterService(masterRepository, redisClient, auditService);

const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);

const staffRepository = new StaffRepository(prisma);
const staffService = new StaffService(prisma, staffRepository, staffRoleRepository, masterRepository, auditService, mailerService, authService, notificationService);

const doctorRepository = new DoctorRepository(prisma);
const doctorService = new DoctorService(prisma, doctorRepository, staffRepository, staffRoleRepository, auditService, mailerService);

const patientRepository = new PatientRepository(prisma);
const patientService = new PatientService(patientRepository);

const passkeyRepository = new PasskeyRepository(prisma);
const passkeyService = new PasskeyService(passkeyRepository, authRepository, sessionService);

const billingRepository = new BillingRepository(prisma);
const billingService = new BillingService(billingRepository, auditService, mailerService);

const receptionistRepository = new ReceptionistRepository(prisma);
const receptionistService = new ReceptionistService(receptionistRepository, billingRepository, billingService);

const financeRepository = new FinanceRepository(prisma);
const financeService = new FinanceService(financeRepository);

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
        mailerService,
        passkeyService,
        receptionistService,
        notificationService,
        billingService,
        financeService,
    },
});

export type AppContext = typeof appContext;
