-- DropForeignKey
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_doctor_availability_id_fkey";

-- AlterTable
ALTER TABLE "appointment" ALTER COLUMN "doctor_availability_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctor_availability_id_fkey" FOREIGN KEY ("doctor_availability_id") REFERENCES "doctor_availability"("doctor_availability_id") ON DELETE SET NULL ON UPDATE CASCADE;
