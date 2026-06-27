-- CreateTable
CREATE TABLE "role_master" (
    "role_id" BIGSERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_master_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "main_master" (
    "master_id" BIGSERIAL NOT NULL,
    "master_name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "main_master_pkey" PRIMARY KEY ("master_id")
);

-- CreateTable
CREATE TABLE "value_master" (
    "value_id" BIGSERIAL NOT NULL,
    "master_id" BIGINT NOT NULL,
    "value_name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "value_master_pkey" PRIMARY KEY ("value_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_master_role_name_key" ON "role_master"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "main_master_master_name_key" ON "main_master"("master_name");

-- CreateIndex
CREATE INDEX "value_master_master_id_idx" ON "value_master"("master_id");

-- CreateIndex
CREATE UNIQUE INDEX "value_master_master_id_value_name_key" ON "value_master"("master_id", "value_name");

-- AddForeignKey
ALTER TABLE "value_master" ADD CONSTRAINT "value_master_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "main_master"("master_id") ON DELETE RESTRICT ON UPDATE CASCADE;
