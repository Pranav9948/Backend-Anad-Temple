-- Stage 7: Razorpay payment gateway fields + FAILED status

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED';

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_order_id" VARCHAR(255);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_payment_id" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_order_id_key" ON "payments"("gateway_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_payment_id_key" ON "payments"("gateway_payment_id");
CREATE INDEX IF NOT EXISTS "payments_gateway_order_id_idx" ON "payments"("gateway_order_id");
CREATE INDEX IF NOT EXISTS "payments_gateway_payment_id_idx" ON "payments"("gateway_payment_id");
