-- Stage 3 schema revision: align with Vinayaka Chathurthi booking spec
-- Drops previous Stage 3 draft tables/enums and recreates the canonical schema.

-- Drop dependent tables (FK order)
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "booking_members" CASCADE;
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "otps" CASCADE;
DROP TABLE IF EXISTS "admins" CASCADE;

-- Drop previous enum types
DROP TYPE IF EXISTS "Language" CASCADE;
DROP TYPE IF EXISTS "AdminRole" CASCADE;
DROP TYPE IF EXISTS "BookingStatus" CASCADE;
DROP TYPE IF EXISTS "BookingPaymentOption" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "OTPStatus" CASCADE;
DROP TYPE IF EXISTS "OTPPurpose" CASCADE;
DROP TYPE IF EXISTS "Nakshatra" CASCADE;

-- Create enums
CREATE TYPE "Language" AS ENUM ('ENGLISH', 'MALAYALAM', 'TAMIL', 'TELUGU', 'HINDI');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'CASH');
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');
CREATE TYPE "OTPStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED');
CREATE TYPE "Nakshatra" AS ENUM (
  'ASHWINI', 'BHARANI', 'KRITTIKA', 'ROHINI', 'MRIGASHIRA', 'ARDRA',
  'PUNARVASU', 'PUSHYA', 'ASHLESHA', 'MAGHA', 'PURVA_PHALGUNI', 'UTTARA_PHALGUNI',
  'HASTA', 'CHITRA', 'SWATI', 'VISHAKHA', 'ANURADHA', 'JYESHTHA', 'MULA',
  'PURVA_ASHADHA', 'UTTARA_ASHADHA', 'SHRAVANA', 'DHANISHTA', 'SHATABHISHA',
  'PURVA_BHADRAPADA', 'UTTARA_BHADRAPADA', 'REVATI'
);

-- admins
CREATE TABLE "admins" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "mobile" VARCHAR(15) NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admins_mobile_key" ON "admins"("mobile");

-- bookings
CREATE TABLE "bookings" (
  "id" UUID NOT NULL,
  "booking_number" VARCHAR(32) NOT NULL,
  "devotee_name" VARCHAR(255) NOT NULL,
  "mobile_number" VARCHAR(15) NOT NULL,
  "language" "Language" NOT NULL,
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "total_amount" INTEGER NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");
CREATE INDEX "bookings_mobile_number_idx" ON "bookings"("mobile_number");
CREATE INDEX "bookings_payment_status_idx" ON "bookings"("payment_status");
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at" DESC);

-- booking_members
CREATE TABLE "booking_members" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "nakshatra" "Nakshatra" NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "booking_members_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "booking_members_booking_id_idx" ON "booking_members"("booking_id");
ALTER TABLE "booking_members"
  ADD CONSTRAINT "booking_members_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- payments
CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "transaction_id" VARCHAR(255),
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at" DESC);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- otps
CREATE TABLE "otps" (
  "id" UUID NOT NULL,
  "mobile" VARCHAR(15) NOT NULL,
  "otp_hash" VARCHAR(255) NOT NULL,
  "status" "OTPStatus" NOT NULL DEFAULT 'PENDING',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "otps_mobile_status_idx" ON "otps"("mobile", "status");
CREATE INDEX "otps_expires_at_idx" ON "otps"("expires_at");
