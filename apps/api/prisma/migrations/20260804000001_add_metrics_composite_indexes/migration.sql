-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_payment_orders_status_updated_amount" ON "payment_orders"("status", "updated_at", "amount_paise");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_bookings_status_provider_created" ON "bookings"("status", "provider_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_bookings_status_paymethod_updated" ON "bookings"("status", "payment_method", "updated_at");
