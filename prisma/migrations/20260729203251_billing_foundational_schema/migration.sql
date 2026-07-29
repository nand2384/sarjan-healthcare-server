-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'ONLINE_GATEWAY');

-- CreateEnum
CREATE TYPE "LineItemType" AS ENUM ('CONSULTATION', 'TEST');

-- AlterTable
ALTER TABLE "doctor_profile" ADD COLUMN     "new_case_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "old_case_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "test_catalog" (
    "test_catalog_id" SERIAL NOT NULL,
    "test_name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "test_catalog_pkey" PRIMARY KEY ("test_catalog_id")
);

-- CreateTable
CREATE TABLE "test_order" (
    "test_order_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "test_catalog_id" INTEGER NOT NULL,
    "ordered_by_staff_id" INTEGER NOT NULL,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_order_pkey" PRIMARY KEY ("test_order_id")
);

-- CreateTable
CREATE TABLE "payment" (
    "payment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "receipt_no" TEXT NOT NULL,
    "consultation_fee_type" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "gateway_provider" TEXT,
    "gateway_transaction_id" TEXT,
    "refund_amount" DECIMAL(10,2),
    "refund_reason" TEXT,
    "refunded_by_staff_id" INTEGER,
    "refunded_at" TIMESTAMP(3),
    "collected_by_staff_id" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "payment_line_item" (
    "payment_line_item_id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "item_type" "LineItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "test_catalog_id" INTEGER,
    "test_order_id" INTEGER,

    CONSTRAINT "payment_line_item_pkey" PRIMARY KEY ("payment_line_item_id")
);

-- CreateIndex
CREATE INDEX "test_catalog_is_active_idx" ON "test_catalog"("is_active");

-- CreateIndex
CREATE INDEX "test_order_patient_id_idx" ON "test_order"("patient_id");

-- CreateIndex
CREATE INDEX "test_order_appointment_id_idx" ON "test_order"("appointment_id");

-- CreateIndex
CREATE INDEX "test_order_test_catalog_id_idx" ON "test_order"("test_catalog_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_appointment_id_key" ON "payment"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipt_no_key" ON "payment"("receipt_no");

-- CreateIndex
CREATE INDEX "payment_patient_id_idx" ON "payment"("patient_id");

-- CreateIndex
CREATE INDEX "payment_line_item_payment_id_idx" ON "payment_line_item"("payment_id");

-- AddForeignKey
ALTER TABLE "test_order" ADD CONSTRAINT "test_order_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_order" ADD CONSTRAINT "test_order_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_order" ADD CONSTRAINT "test_order_test_catalog_id_fkey" FOREIGN KEY ("test_catalog_id") REFERENCES "test_catalog"("test_catalog_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_order" ADD CONSTRAINT "test_order_ordered_by_staff_id_fkey" FOREIGN KEY ("ordered_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_collected_by_staff_id_fkey" FOREIGN KEY ("collected_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_refunded_by_staff_id_fkey" FOREIGN KEY ("refunded_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_line_item" ADD CONSTRAINT "payment_line_item_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("payment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_line_item" ADD CONSTRAINT "payment_line_item_test_catalog_id_fkey" FOREIGN KEY ("test_catalog_id") REFERENCES "test_catalog"("test_catalog_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_line_item" ADD CONSTRAINT "payment_line_item_test_order_id_fkey" FOREIGN KEY ("test_order_id") REFERENCES "test_order"("test_order_id") ON DELETE SET NULL ON UPDATE CASCADE;
