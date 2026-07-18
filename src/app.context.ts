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

const staffRepository = new StaffRepository(prisma);
const staffService = new StaffService(prisma, staffRepository, staffRoleRepository, masterRepository, auditService, mailerService);

const doctorRepository = new DoctorRepository(prisma);
const doctorService = new DoctorService(prisma, doctorRepository, staffRepository, staffRoleRepository, auditService, mailerService);

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
        mailerService,
    },
});
