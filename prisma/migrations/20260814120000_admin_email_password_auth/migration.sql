-- Admin email/password authentication (replaces mobile OTP login).

ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT true;

-- Allow existing OTP-era rows to keep mobile while email becomes the login key.
ALTER TABLE "admins" ALTER COLUMN "mobile" DROP NOT NULL;

-- Backfill placeholder credentials for any pre-existing admins (must re-seed).
UPDATE "admins"
SET
  "email" = COALESCE("email", CONCAT('admin+', "id"::text, '@local.invalid')),
  "password_hash" = COALESCE("password_hash", '!')
WHERE "email" IS NULL OR "password_hash" IS NULL;

ALTER TABLE "admins" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "admins" ALTER COLUMN "password_hash" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_key'
  ) THEN
    ALTER TABLE "admins" ADD CONSTRAINT "admins_email_key" UNIQUE ("email");
  END IF;
END $$;
