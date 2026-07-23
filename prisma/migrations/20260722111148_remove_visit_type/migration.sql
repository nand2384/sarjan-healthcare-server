/*
  Warnings:

  - You are about to drop the column `visit_type_id` on the `appointment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_visit_type_id_fkey";

-- DropIndex
DROP INDEX "appointment_visit_type_id_idx";

-- AlterTable
ALTER TABLE "appointment" DROP COLUMN "visit_type_id";
