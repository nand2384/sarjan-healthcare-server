/*
  Warnings:

  - A unique constraint covering the columns `[password_reset_token]` on the table `staff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_COMPLETED';

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "password_reset_token_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "staff_password_reset_token_key" ON "staff"("password_reset_token");
