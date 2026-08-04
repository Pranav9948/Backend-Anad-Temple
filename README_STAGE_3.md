# Stage 3 — Temple Booking Domain & Database Design

Stage 3 implements the **PostgreSQL database layer only** for the Anad Chamundi Temple Vinayaka Chathurthi booking application. No controllers, routes, services, repositories, or business APIs were added.

---

## Folder Structure (Stage 3 additions)

```
prisma/
├── schema.prisma                          # Domain schema (brand-new, not from SaaS)
├── seed.ts                                # Default admin seed
└── migrations/
    ├── migration_lock.toml
    └── 20260804000000_init_temple_booking_schema/
        └── migration.sql

src/generated/prisma/                      # Prisma Client (auto-generated — do not edit)
```

---

## Why Each Model Exists

| Model | Purpose |
|-------|---------|
| **Admin** | Temple staff who log in to manage bookings and record offline payments. Independent of bookings. |
| **Booking** | Core record when a devotee submits the form: language, name, mobile, payment choice, and status. |
| **BookingMember** | One or more Archana participants per booking, each with a name and nakshatra. |
| **Payment** | Optional financial record — created for online checkout or added later by admin for pay-later bookings. At most **one** payment per booking. |
| **OTP** | Mobile verification codes (hashed, never plain text). Independent of bookings; looked up by mobile number. |

### Supporting enums (no extra models)

Additional enums (`BookingStatus`, `BookingPaymentOption`, `Nakshatra`, etc.) replace free-form strings to enforce valid values at the database level. No extra tables were needed beyond the five required models.

---

## Enums

| Enum | Values | Used by |
|------|--------|---------|
| **Language** | `KANNADA`, `ENGLISH`, `TELUGU`, `TAMIL`, `HINDI`, `MALAYALAM` | `Booking.language` |
| **AdminRole** | `SUPER_ADMIN`, `ADMIN` | `Admin.role` |
| **BookingStatus** | `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED` | `Booking.status` |
| **BookingPaymentOption** | `PAY_ONLINE`, `PAY_LATER` | `Booking.paymentOption` |
| **PaymentStatus** | `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `WAIVED` | `Payment.status` |
| **PaymentMethod** | `RAZORPAY`, `CASH`, `UPI`, `BANK_TRANSFER`, `OTHER` | `Payment.method` |
| **OTPStatus** | `PENDING`, `VERIFIED`, `EXPIRED`, `FAILED` | `OTP.status` |
| **OTPPurpose** | `BOOKING_VERIFICATION`, `ADMIN_LOGIN` | `OTP.purpose` |
| **Nakshatra** | 27 lunar mansions (`ASHWINI` … `REVATI`) | `BookingMember.nakshatra` |

---

## Models (field reference)

### Admin → table `admins`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `email` | String | **Unique** — login identifier |
| `passwordHash` | String | bcrypt hash (never plain password) |
| `name` | String | Display name |
| `role` | AdminRole | Default `ADMIN` |
| `isActive` | Boolean | Default `true` |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

### Booking → table `bookings`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `referenceNumber` | String(32) | **Unique** human-readable ref (e.g. `TB-2026-000001`) |
| `language` | Language | Devotee's selected language |
| `devoteeName` | String | Primary contact name |
| `mobileNumber` | String(15) | E.164-friendly length |
| `status` | BookingStatus | Default `PENDING_PAYMENT` |
| `paymentOption` | BookingPaymentOption | `PAY_ONLINE` or `PAY_LATER` |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Indexes:** `mobileNumber`, `status`, `createdAt DESC`

### BookingMember → table `booking_members`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `bookingId` | UUID | FK → `bookings.id` |
| `memberName` | String | Archana member name |
| `nakshatra` | Nakshatra | One of 27 enum values |
| `sortOrder` | Int | Display order (default `0`) |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Indexes:** `bookingId`

### Payment → table `payments`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `bookingId` | UUID | **Unique** FK → `bookings.id` (0..1 payment per booking) |
| `amountPaise` | Int | Amount in paise (INR × 100) — avoids float rounding |
| `currency` | Char(3) | Default `INR` |
| `status` | PaymentStatus | Default `PENDING` |
| `method` | PaymentMethod | How payment was/will be collected |
| `gatewayOrderId` | String? | Future Razorpay order id |
| `gatewayPaymentId` | String? | Future Razorpay payment id |
| `paidAt` | Timestamptz? | When payment completed |
| `adminNotes` | Text? | Admin remarks |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Indexes:** `status`, `createdAt DESC`

### OTP → table `otps`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `mobileNumber` | String(15) | Target phone |
| `otpHash` | String | Hashed OTP (never store plain text) |
| `purpose` | OTPPurpose | Why OTP was issued |
| `status` | OTPStatus | Default `PENDING` |
| `attemptCount` | Int | Brute-force guard (default `0`) |
| `expiresAt` | Timestamptz | Expiry time |
| `verifiedAt` | Timestamptz? | Set when verified |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Indexes:** `(mobileNumber, status)`, `expiresAt`

---

## Relationships

```
Admin          (independent — no FK to other models)

OTP            (independent — no FK to other models)

Booking 1 ──────< BookingMember   (one booking, many members)
   │
   └────────── Payment 0..1       (optional one-to-one)
```

| Relationship | Cardinality | On delete | Why |
|--------------|-------------|-----------|-----|
| Booking → BookingMember | 1 : N | **Cascade** | Members have no meaning without their booking. |
| Booking → Payment | 1 : 0..1 | **Restrict** | Prevents deleting a booking that still has a payment record (audit safety). Admin must handle payment first. |
| Admin | Independent | — | Staff accounts are not tied to individual bookings. |
| OTP | Independent | — | OTPs are ephemeral verification records looked up by mobile + status. |

---

## Database Diagram (ASCII)

```
┌─────────────────┐
│     admins      │
├─────────────────┤
│ id (PK)         │
│ email (UNIQUE)  │
│ password_hash   │
│ name            │
│ role            │
│ is_active       │
│ created_at      │
│ updated_at      │
└─────────────────┘


┌─────────────────┐       ┌──────────────────────┐
│    bookings     │       │   booking_members    │
├─────────────────┤       ├──────────────────────┤
│ id (PK)         │──┐    │ id (PK)              │
│ reference_no(UQ)│  │    │ booking_id (FK) ─────┤
│ language        │  └───>│ member_name          │
│ devotee_name    │  1:N  │ nakshatra            │
│ mobile_number   │       │ sort_order           │
│ status          │       │ created_at           │
│ payment_option  │       │ updated_at           │
│ created_at      │       └──────────────────────┘
│ updated_at      │
└────────┬────────┘
         │ 1 : 0..1
         ▼
┌─────────────────┐
│    payments     │
├─────────────────┤
│ id (PK)         │
│ booking_id (FK,UQ)
│ amount_paise    │
│ currency        │
│ status          │
│ method          │
│ gateway_order_id│
│ gateway_payment_id
│ paid_at         │
│ admin_notes     │
│ created_at      │
│ updated_at      │
└─────────────────┘


┌─────────────────┐
│      otps       │
├─────────────────┤
│ id (PK)         │
│ mobile_number   │
│ otp_hash        │
│ purpose         │
│ status          │
│ attempt_count   │
│ expires_at      │
│ verified_at     │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

---

## Commands

All commands assume you are in the project root and PostgreSQL is running locally.

### 1. Generate Prisma Client

```powershell
pnpm run db:generate
```

### 2. Apply migrations (fresh / CI)

```powershell
pnpm run db:migrate:deploy
```

### 3. Apply migrations (development — creates new migration files)

```powershell
pnpm run db:migrate
```

### 4. Push schema without migration history (dev shortcut only)

```powershell
pnpm run db:push
```

### 5. Seed default admin

Set these in `.env.development` first (see `.env.example`):

```
ADMIN_SEED_EMAIL=admin@temple.local
ADMIN_SEED_NAME=Temple Admin
ADMIN_SEED_PASSWORD=change-me-min-10-chars
```

Then run:

```powershell
pnpm run db:seed
```

Expected output:

```
Seeded default admin: admin@temple.local (SUPER_ADMIN)
The seed command has been executed.
```

### 6. Prisma Studio (visual DB browser)

```powershell
pnpm run db:studio
```

Opens at `http://localhost:5555` by default.

---

## Stage 3 Checklist

- [x] Prisma schema created
- [x] Enums created
- [x] Relationships verified
- [x] Migration generated (`20260804000000_init_temple_booking_schema`)
- [x] Migration applied
- [x] Prisma Client generated
- [x] Seed executed
- [ ] Prisma Studio verified *(run locally)*

---

## Stage 3 Completion Verification

### Step 1 — Generate client

```powershell
pnpm run db:generate
```

**Expected:** `✔ Generated Prisma Client` with no errors.

### Step 2 — Confirm migration status

```powershell
pnpm exec dotenv -e .env.development -- prisma migrate status
```

**Expected:**

```
1 migration found in prisma/migrations
Database schema is up to date!
```

### Step 3 — Run seed

```powershell
pnpm run db:seed
```

**Expected:** `Seeded default admin: admin@temple.local (SUPER_ADMIN)`

### Step 4 — Tables in PostgreSQL

Connect to `dev_temple_booking` and run:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected tables:**

| Table | Description |
|-------|-------------|
| `_prisma_migrations` | Prisma migration history |
| `admins` | Temple admin accounts |
| `bookings` | Devotee bookings |
| `booking_members` | Archana members |
| `payments` | Payment records |
| `otps` | OTP verification records |

`Stage2Placeholder` should **not** exist anymore.

### Step 5 — Verify seed data

```sql
SELECT id, email, name, role, is_active FROM admins;
```

**Expected:** One row — `admin@temple.local`, role `SUPER_ADMIN`.

### Step 6 — Verify foreign keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

**Expected FKs:**

| From | Column | To | On delete |
|------|--------|-----|-----------|
| `booking_members` | `booking_id` | `bookings.id` | `CASCADE` |
| `payments` | `booking_id` | `bookings.id` | `RESTRICT` |

### Step 7 — Verify indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
```

**Expected indexes include:**

- `admins_email_key` (unique)
- `bookings_reference_number_key` (unique)
- `bookings_mobile_number_idx`
- `bookings_status_idx`
- `bookings_created_at_idx`
- `booking_members_booking_id_idx`
- `payments_booking_id_key` (unique)
- `payments_status_idx`
- `payments_created_at_idx`
- `otps_mobile_number_status_idx`
- `otps_expires_at_idx`

### Step 8 — Prisma Studio

```powershell
pnpm run db:studio
```

1. Open `http://localhost:5555`
2. Click **Admin** — confirm one seeded row
3. Confirm **Booking**, **BookingMember**, **Payment**, **OTP** tables exist (empty until Stage 4+)

### Step 9 — Build still passes

```powershell
pnpm run build
```

**Expected:** Exit code `0` (Prisma Client compiles with the rest of the app).

---

## Design Decisions

1. **Brand-new schema** — Stage 2's `Stage2Placeholder` was removed. No SaaS models were copied.
2. **`amountPaise` as integer** — avoids floating-point money bugs; standard for INR.
3. **`BookingPaymentOption`** — captures "pay online" vs "book without payment" at booking time; payment record is optional for `PAY_LATER`.
4. **`gatewayOrderId` / `gatewayPaymentId`** — nullable placeholders for future Razorpay integration (Stage 4+); not used in Stage 3.
5. **`otpHash` only** — plain OTPs must never be stored.
6. **`onDelete: Restrict` on Payment** — protects financial audit trail from accidental booking deletion.

---

## Environment Variables (Stage 3)

Add to `.env.development`:

```env
ADMIN_SEED_EMAIL=admin@temple.local
ADMIN_SEED_NAME=Temple Admin
ADMIN_SEED_PASSWORD=change-me-min-10-chars
```

`ADMIN_SEED_PASSWORD` is **required** for seeding. It is read from the environment — never hardcoded in source code.

---

## Next Stage (not in scope)

Stage 4+ will add repositories, services, controllers, routes, OTP flows, Razorpay, and admin APIs on top of this schema.
