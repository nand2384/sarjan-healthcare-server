-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'RESET_PASSWORD', 'CHANGE_PASSWORD', 'ENABLE', 'DISABLE');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('STAFF', 'DOCTOR', 'PATIENT', 'APPOINTMENT', 'BILLING', 'LABORATORY', 'INVENTORY', 'WEBSITE');

-- CreateTable
CREATE TABLE "role_master" (
    "role_id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_master_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "main_master" (
    "master_id" SERIAL NOT NULL,
    "master_name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "main_master_pkey" PRIMARY KEY ("master_id")
);

-- CreateTable
CREATE TABLE "value_master" (
    "value_id" SERIAL NOT NULL,
    "master_id" INTEGER NOT NULL,
    "value_name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "value_master_pkey" PRIMARY KEY ("value_id")
);

-- CreateTable
CREATE TABLE "staff" (
    "staff_id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "gender_id" INTEGER NOT NULL,
    "age" INTEGER,
    "street_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "profile_image_url" TEXT,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_system_account" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_account_activated" BOOLEAN NOT NULL DEFAULT false,
    "activation_token" TEXT,
    "activation_token_expires_at" TIMESTAMP(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "staff_role" (
    "staff_role_id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_role_pkey" PRIMARY KEY ("staff_role_id")
);

-- CreateTable
CREATE TABLE "patient" (
    "patient_id" SERIAL NOT NULL,
    "patient_account_id" INTEGER,
    "uhid" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "mobile_number" TEXT,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "gender_id" INTEGER NOT NULL,
    "age" INTEGER,
    "street_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patient_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "patient_account" (
    "patient_account_id" SERIAL NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "password_hash" TEXT,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patient_account_pkey" PRIMARY KEY ("patient_account_id")
);

-- CreateTable
CREATE TABLE "doctor_profile" (
    "doctor_profile_id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "registration_number" TEXT,
    "specialization" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "biography" TEXT,
    "profile_image_url" TEXT,
    "experience" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_visible_on_website" BOOLEAN NOT NULL DEFAULT true,
    "is_accepting_appointments" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "doctor_profile_pkey" PRIMARY KEY ("doctor_profile_id")
);

-- CreateTable
CREATE TABLE "session" (
    "session_id" TEXT NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "audit_log_id" BIGSERIAL NOT NULL,
    "performed_by_staff_id" INTEGER,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_master_role_name_key" ON "role_master"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "main_master_master_name_key" ON "main_master"("master_name");

-- CreateIndex
CREATE INDEX "value_master_master_id_idx" ON "value_master"("master_id");

-- CreateIndex
CREATE UNIQUE INDEX "value_master_master_id_value_name_key" ON "value_master"("master_id", "value_name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_username_key" ON "staff"("username");

-- CreateIndex
CREATE UNIQUE INDEX "staff_mobile_number_key" ON "staff"("mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_activation_token_key" ON "staff"("activation_token");

-- CreateIndex
CREATE INDEX "staff_gender_id_idx" ON "staff"("gender_id");

-- CreateIndex
CREATE INDEX "staff_username_idx" ON "staff"("username");

-- CreateIndex
CREATE INDEX "staff_email_idx" ON "staff"("email");

-- CreateIndex
CREATE INDEX "staff_role_staff_id_idx" ON "staff_role"("staff_id");

-- CreateIndex
CREATE INDEX "staff_role_role_id_idx" ON "staff_role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_role_staff_id_role_id_key" ON "staff_role"("staff_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_uhid_key" ON "patient"("uhid");

-- CreateIndex
CREATE INDEX "patient_gender_id_idx" ON "patient"("gender_id");

-- CreateIndex
CREATE INDEX "patient_patient_account_id_idx" ON "patient"("patient_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_account_mobile_number_key" ON "patient_account"("mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profile_staff_id_key" ON "doctor_profile"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profile_registration_number_key" ON "doctor_profile"("registration_number");

-- CreateIndex
CREATE INDEX "doctor_profile_staff_id_idx" ON "doctor_profile"("staff_id");

-- CreateIndex
CREATE INDEX "session_staff_id_idx" ON "session"("staff_id");

-- CreateIndex
CREATE INDEX "session_expires_at_idx" ON "session"("expires_at");

-- CreateIndex
CREATE INDEX "audit_log_performed_by_staff_id_idx" ON "audit_log"("performed_by_staff_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_idx" ON "audit_log"("entity_type");

-- CreateIndex
CREATE INDEX "audit_log_entity_id_idx" ON "audit_log"("entity_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "value_master" ADD CONSTRAINT "value_master_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "main_master"("master_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "value_master"("value_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_role" ADD CONSTRAINT "staff_role_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_role" ADD CONSTRAINT "staff_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role_master"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "value_master"("value_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_patient_account_id_fkey" FOREIGN KEY ("patient_account_id") REFERENCES "patient_account"("patient_account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profile" ADD CONSTRAINT "doctor_profile_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_performed_by_staff_id_fkey" FOREIGN KEY ("performed_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;
