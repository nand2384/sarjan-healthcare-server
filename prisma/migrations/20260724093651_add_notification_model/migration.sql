-- CreateTable
CREATE TABLE "notification" (
    "notification_id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "notification_staff_id_idx" ON "notification"("staff_id");

-- CreateIndex
CREATE INDEX "notification_is_read_idx" ON "notification"("is_read");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;
