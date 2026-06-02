-- CreateTable pricing_master
CREATE TABLE IF NOT EXISTS "pricing_master" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "service_name_en" TEXT NOT NULL,
  "service_name_th" TEXT,
  "category" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "rate_thb" NUMERIC(12,2) NOT NULL,
  "description" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex pricing_master_code_key
CREATE UNIQUE INDEX "pricing_master_code_key" ON "pricing_master"("code");
