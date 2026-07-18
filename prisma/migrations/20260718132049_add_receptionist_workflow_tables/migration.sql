-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "QueueType" AS ENUM ('BOOKED', 'WALK_IN');

-- CreateTable
CREATE TABLE "doctor_availability" (
    "doctor_availability_id" SERIAL NOT NULL,
    "doctor_staff_id" INTEGER NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "slot_name" TEXT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "maximum_appointments" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("doctor_availability_id")
);

-- CreateTable
CREATE TABLE "doctor_leave" (
    "doctor_leave_id" SERIAL NOT NULL,
    "doctor_staff_id" INTEGER NOT NULL,
    "doctor_availability_id" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_leave_pkey" PRIMARY KEY ("doctor_leave_id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "appointment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_staff_id" INTEGER NOT NULL,
    "doctor_availability_id" INTEGER NOT NULL,
    "appointment_status_id" INTEGER NOT NULL,
    "visit_type_id" INTEGER NOT NULL,
    "visit_reason_id" INTEGER NOT NULL,
    "created_by_staff_id" INTEGER NOT NULL,
    "appointment_date" DATE NOT NULL,
    "appointment_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "appointment_workflow_history" (
    "appointment_workflow_history_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "appointment_workflow_status_id" INTEGER NOT NULL,
    "changed_by_staff_id" INTEGER NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_workflow_history_pkey" PRIMARY KEY ("appointment_workflow_history_id")
);

-- CreateTable
CREATE TABLE "queue" (
    "queue_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "queue_number" INTEGER NOT NULL,
    "queue_type" "QueueType" NOT NULL,
    "joined_queue_at" TIMESTAMP(3) NOT NULL,
    "joined_after_consultation_sequence" INTEGER NOT NULL,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_pkey" PRIMARY KEY ("queue_id")
);

-- CreateIndex
CREATE INDEX "doctor_availability_doctor_staff_id_idx" ON "doctor_availability"("doctor_staff_id");

-- CreateIndex
CREATE INDEX "doctor_availability_day_of_week_idx" ON "doctor_availability"("day_of_week");

-- CreateIndex
CREATE INDEX "doctor_leave_doctor_staff_id_idx" ON "doctor_leave"("doctor_staff_id");

-- CreateIndex
CREATE INDEX "doctor_leave_doctor_availability_id_idx" ON "doctor_leave"("doctor_availability_id");

-- CreateIndex
CREATE INDEX "doctor_leave_start_date_idx" ON "doctor_leave"("start_date");

-- CreateIndex
CREATE INDEX "doctor_leave_end_date_idx" ON "doctor_leave"("end_date");

-- CreateIndex
CREATE INDEX "appointment_patient_id_idx" ON "appointment"("patient_id");

-- CreateIndex
CREATE INDEX "appointment_doctor_staff_id_idx" ON "appointment"("doctor_staff_id");

-- CreateIndex
CREATE INDEX "appointment_doctor_availability_id_idx" ON "appointment"("doctor_availability_id");

-- CreateIndex
CREATE INDEX "appointment_appointment_status_id_idx" ON "appointment"("appointment_status_id");

-- CreateIndex
CREATE INDEX "appointment_visit_type_id_idx" ON "appointment"("visit_type_id");

-- CreateIndex
CREATE INDEX "appointment_visit_reason_id_idx" ON "appointment"("visit_reason_id");

-- CreateIndex
CREATE INDEX "appointment_created_by_staff_id_idx" ON "appointment"("created_by_staff_id");

-- CreateIndex
CREATE INDEX "appointment_appointment_date_idx" ON "appointment"("appointment_date");

-- CreateIndex
CREATE INDEX "appointment_appointment_date_doctor_staff_id_idx" ON "appointment"("appointment_date", "doctor_staff_id");

-- CreateIndex
CREATE INDEX "appointment_appointment_date_appointment_status_id_idx" ON "appointment"("appointment_date", "appointment_status_id");

-- CreateIndex
CREATE INDEX "appointment_workflow_history_appointment_id_idx" ON "appointment_workflow_history"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_workflow_history_appointment_workflow_status_id_idx" ON "appointment_workflow_history"("appointment_workflow_status_id");

-- CreateIndex
CREATE INDEX "appointment_workflow_history_changed_by_staff_id_idx" ON "appointment_workflow_history"("changed_by_staff_id");

-- CreateIndex
CREATE INDEX "appointment_workflow_history_created_at_idx" ON "appointment_workflow_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "queue_appointment_id_key" ON "queue"("appointment_id");

-- CreateIndex
CREATE INDEX "queue_queue_type_idx" ON "queue"("queue_type");

-- CreateIndex
CREATE INDEX "queue_joined_queue_at_idx" ON "queue"("joined_queue_at");

-- CreateIndex
CREATE INDEX "queue_is_active_idx" ON "queue"("is_active");

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctor_staff_id_fkey" FOREIGN KEY ("doctor_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave" ADD CONSTRAINT "doctor_leave_doctor_staff_id_fkey" FOREIGN KEY ("doctor_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave" ADD CONSTRAINT "doctor_leave_doctor_availability_id_fkey" FOREIGN KEY ("doctor_availability_id") REFERENCES "doctor_availability"("doctor_availability_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctor_staff_id_fkey" FOREIGN KEY ("doctor_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctor_availability_id_fkey" FOREIGN KEY ("doctor_availability_id") REFERENCES "doctor_availability"("doctor_availability_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_appointment_status_id_fkey" FOREIGN KEY ("appointment_status_id") REFERENCES "value_master"("value_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_visit_type_id_fkey" FOREIGN KEY ("visit_type_id") REFERENCES "value_master"("value_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_visit_reason_id_fkey" FOREIGN KEY ("visit_reason_id") REFERENCES "value_master"("value_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_workflow_history" ADD CONSTRAINT "appointment_workflow_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_workflow_history" ADD CONSTRAINT "appointment_workflow_history_appointment_workflow_status_i_fkey" FOREIGN KEY ("appointment_workflow_status_id") REFERENCES "value_master"("value_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_workflow_history" ADD CONSTRAINT "appointment_workflow_history_changed_by_staff_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue" ADD CONSTRAINT "queue_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;
