-- Add optional devotee address on bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "address" VARCHAR(500);
