/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `is_revoked` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "deleted_at",
DROP COLUMN "is_revoked";
