-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_bookings_created_at" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_payment_orders_booking_id" ON "payment_orders"("booking_id");
