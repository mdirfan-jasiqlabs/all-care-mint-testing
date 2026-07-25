-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'STARTED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_SERVICE', 'ONLINE');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "fixed_price" DECIMAL(12,2) NOT NULL,
    "estimated_duration" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_hash" VARCHAR(64) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_time_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" VARCHAR(100) NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_reference" VARCHAR(30) NOT NULL,
    "customer_id" UUID NOT NULL,
    "provider_id" UUID,
    "service_id" UUID NOT NULL,
    "service_name_snapshot" VARCHAR(150) NOT NULL,
    "service_price_snapshot" DECIMAL(12,2) NOT NULL,
    "address_id" UUID,
    "address_snapshot" JSONB NOT NULL,
    "slot_date" DATE NOT NULL,
    "slot_id" UUID,
    "slot_label_snapshot" VARCHAR(100) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" UUID NOT NULL,
    "rejection_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "response_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(50) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_slot_locks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot_id" UUID NOT NULL,
    "slot_date" DATE NOT NULL,
    "customer_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "booking_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_slot_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE INDEX "idx_services_category_id" ON "services"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_service_name_category" ON "services"("category_id", "name");

-- CreateIndex
CREATE INDEX "idx_addresses_customer_id" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "idx_bookings_customer_status" ON "bookings"("customer_id", "status");

-- CreateIndex
CREATE INDEX "idx_bookings_provider_status" ON "bookings"("provider_id", "status");

-- CreateIndex
CREATE INDEX "idx_bookings_status_slot_date" ON "bookings"("status", "slot_date");

-- CreateIndex
CREATE INDEX "idx_bookings_slot_date" ON "bookings"("slot_date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_customer_idempotency" ON "idempotency_keys"("customer_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_bsh_booking_id" ON "booking_status_history"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_slot_lock_date_slot" ON "booking_slot_locks"("slot_date", "slot_id");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slot_locks" ADD CONSTRAINT "booking_slot_locks_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_time_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slot_locks" ADD CONSTRAINT "booking_slot_locks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slot_locks" ADD CONSTRAINT "booking_slot_locks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create partial unique index for active booking slots
CREATE UNIQUE INDEX uq_active_booking_slot_date
ON bookings(slot_id, slot_date)
WHERE status NOT IN ('CANCELLED', 'REJECTED');

