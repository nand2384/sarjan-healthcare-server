-- CreateEnum
CREATE TYPE "PasskeyDeviceType" AS ENUM ('SINGLE_DEVICE', 'MULTI_DEVICE');

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "challenge_created_at" TIMESTAMP(3),
ADD COLUMN     "current_challenge" TEXT;

-- CreateTable
CREATE TABLE "passkey_credential" (
    "id" TEXT NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL,
    "transports" TEXT[],
    "device_type" "PasskeyDeviceType" NOT NULL,
    "backed_up" BOOLEAN NOT NULL,
    "device_name" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passkey_credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credential_credential_id_key" ON "passkey_credential"("credential_id");

-- CreateIndex
CREATE INDEX "passkey_credential_staff_id_idx" ON "passkey_credential"("staff_id");

-- AddForeignKey
ALTER TABLE "passkey_credential" ADD CONSTRAINT "passkey_credential_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;
