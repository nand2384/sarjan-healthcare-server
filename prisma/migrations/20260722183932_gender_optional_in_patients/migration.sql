-- DropForeignKey
ALTER TABLE "patient" DROP CONSTRAINT "patient_gender_id_fkey";

-- AlterTable
ALTER TABLE "patient" ALTER COLUMN "gender_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "value_master"("value_id") ON DELETE SET NULL ON UPDATE CASCADE;
