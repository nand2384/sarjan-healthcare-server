-- CreateTable
CREATE TABLE "staff" (
    "staff_id" BIGSERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "gender_id" BIGINT NOT NULL,
    "age" INTEGER,
    "street_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "profile_image_url" TEXT,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "staff_role" (
    "staff_role_id" BIGSERIAL NOT NULL,
    "staff_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_role_pkey" PRIMARY KEY ("staff_role_id")
);

-- CreateTable
CREATE TABLE "patient" (
    "patient_id" BIGSERIAL NOT NULL,
    "patient_account_id" BIGINT,
    "uhid" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "mobile_number" TEXT,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "gender_id" BIGINT NOT NULL,
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
    "patient_account_id" BIGSERIAL NOT NULL,
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
    "doctor_profile_id" BIGSERIAL NOT NULL,
    "staff_id" BIGINT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "staff_mobile_number_key" ON "staff"("mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE INDEX "staff_gender_id_idx" ON "staff"("gender_id");

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
