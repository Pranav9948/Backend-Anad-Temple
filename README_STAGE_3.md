# Stage 3 — Database Design & Prisma Implementation

Stage 3 implements the **PostgreSQL database layer only** for the Vinayaka Chathurthi Ganapathi Homam booking system. No routes, controllers, services, repositories, or business logic were added.

---

## Folder Structure (after Stage 3)

```
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
    ├── migration_lock.toml
    ├── 20260804000000_init_temple_booking_schema/
    │   └── migration.sql          # Initial draft (superseded)
    └── 20260804160000_stage3_schema_revision/
        └── migration.sql          # Canonical Stage 3 schema

src/generated/prisma/              # Auto-generated Prisma Client (do not edit)
```

---

## Database Overview

### Admin → `admins`

Temple administrator identified by **mobile number**. Admin login uses OTP (see `OTP` model). Independent of bookings.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `name` | String | Display name |
| `mobile` | String(15) | **Unique** — login identifier |
| `role` | AdminRole | Default `ADMIN` |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Why it exists:** Temple staff need a persistent identity to manage bookings and payments. Mobile is the natural identifier for OTP-based admin login in India.

---

### Booking → `bookings`

One devotee submission: language, contact details, payment status, and total amount.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `bookingNumber` | String(32) | **Unique** human-readable reference |
| `devoteeName` | String | Primary contact name |
| `mobileNumber` | String(15) | Devotee phone |
| `language` | Language | Selected form language |
| `paymentStatus` | PaymentStatus | `PENDING` or `PAID` — quick admin filtering |
| `totalAmount` | Int | Amount in **paise** (INR × 100) |
| `notes` | Text? | Optional admin/devotee notes |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Why it exists:** Central record for each Homam/Archana booking. `paymentStatus` on the booking allows fast list queries without always joining `payments`.

**Why `notes` is optional:** Not every booking needs remarks; avoids nullable-field clutter elsewhere.

**Why `totalAmount` is required:** Every booking has a computed total at checkout time, even for pay-later flows.

---

### BookingMember → `booking_members`

One or more Archana participants per booking.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `bookingId` | UUID | FK → `bookings.id` |
| `name` | String | Member name |
| `nakshatra` | Nakshatra | One of 27 enum values |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Why it exists:** A single booking often covers multiple family members, each requiring name and nakshatra for the pooja.

---

### Payment → `payments`

Online or offline payment — **at most one per booking** (0..1).

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `bookingId` | UUID | **Unique** FK → `bookings.id` |
| `amount` | Int | Paise |
| `method` | PaymentMethod | `ONLINE` or `CASH` |
| `transactionId` | String? | **Unique** when set — gateway/bank reference |
| `status` | PaymentStatus | `PENDING` or `PAID` |
| `paidAt` | Timestamptz? | Set when payment completes |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Why it exists:** Separates financial audit trail from the booking record. Pay-later bookings have no `Payment` row until admin records one.

**Why `transactionId` is optional:** Cash/offline payments may not have a gateway ID initially.

**Why `paidAt` is optional:** Unpaid records have no completion timestamp.

---

### OTP → `otps`

Mobile OTP for **admin login**. Independent of bookings.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `mobile` | String(15) | Target phone |
| `otpHash` | String | Hashed OTP — **never store plain text** |
| `status` | OTPStatus | `PENDING`, `VERIFIED`, `EXPIRED` |
| `verified` | Boolean | Convenience flag (true when verified) |
| `attempts` | Int | Brute-force counter (default 0) |
| `expiresAt` | Timestamptz | Expiry time |
| `createdAt` / `updatedAt` | Timestamptz | Auto-managed |

**Why it exists:** Supports passwordless admin authentication via SMS OTP.

**Why both `status` and `verified`:** `status` is the canonical lifecycle enum; `verified` enables simple boolean queries in Stage 4 repositories.

---

## Relationships

```
Admin     (independent)

OTP       (independent)

Booking 1 ──────< BookingMember     (1 : N, CASCADE delete)
   │
   └────────── Payment 0..1         (1 : 0..1, RESTRICT delete)
```

| From | To | Cardinality | On delete | Why |
|------|-----|-------------|-----------|-----|
| Booking → BookingMember | 1 : N | **Cascade** | Members belong exclusively to one booking |
| Booking → Payment | 1 : 0..1 | **Restrict** | Protects payment audit trail from accidental booking deletion |
| Admin | — | Independent | Staff not tied to individual bookings |
| OTP | — | Independent | Ephemeral verification records |

---

## Enums

| Enum | Values | Why |
|------|--------|-----|
| **Language** | `ENGLISH`, `MALAYALAM`, `TAMIL`, `TELUGU`, `HINDI` | Supported devotee languages — prevents invalid strings |
| **PaymentStatus** | `PENDING`, `PAID` | Simple payment lifecycle for MVP |
| **PaymentMethod** | `ONLINE`, `CASH` | Distinguishes gateway vs temple counter collection |
| **AdminRole** | `ADMIN` | Extensible later (`SUPER_ADMIN`) without schema migration pain |
| **OTPStatus** | `PENDING`, `VERIFIED`, `EXPIRED` | OTP lifecycle for admin login |
| **Nakshatra** | 27 lunar mansions | Valid Archana nakshatra values at DB level |

---

## Database Diagram (ASCII)

```
┌──────────────────┐
│      admins      │
├──────────────────┤
│ id (PK)          │
│ name             │
│ mobile (UNIQUE)  │
│ role             │
│ created_at       │
│ updated_at       │
└──────────────────┘


┌──────────────────┐         ┌─────────────────────┐
│     bookings     │         │   booking_members   │
├──────────────────┤         ├─────────────────────┤
│ id (PK)          │────┐    │ id (PK)             │
│ booking_no (UQ)  │    └───>│ booking_id (FK)     │
│ devotee_name     │   1:N   │ name                │
│ mobile_number    │         │ nakshatra           │
│ language         │         │ created_at          │
│ payment_status   │         │ updated_at          │
│ total_amount     │         └─────────────────────┘
│ notes            │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │ 1 : 0..1
         ▼
┌──────────────────┐
│     payments     │
├──────────────────┤
│ id (PK)          │
│ booking_id (FK,UQ)
│ amount           │
│ method           │
│ transaction_id(UQ)
│ status           │
│ paid_at          │
│ created_at       │
│ updated_at       │
└──────────────────┘


┌──────────────────┐
│       otps       │
├──────────────────┤
│ id (PK)          │
│ mobile           │
│ otp_hash         │
│ status           │
│ verified         │
│ attempts         │
│ expires_at       │
│ created_at       │
│ updated_at       │
└──────────────────┘
```

---

## Indexes & Why They Exist

| Index | Table | Why |
|-------|-------|-----|
| `admins_mobile_key` (unique) | admins | One account per mobile; login lookup |
| `bookings_booking_number_key` (unique) | bookings | Public booking reference lookups |
| `bookings_mobile_number_idx` | bookings | Search bookings by devotee phone |
| `bookings_payment_status_idx` | bookings | Admin dashboard: pending vs paid lists |
| `bookings_created_at_idx` | bookings | Recent bookings sort (DESC) |
| `booking_members_booking_id_idx` | booking_members | Load all members for a booking |
| `payments_booking_id_key` (unique) | payments | Enforce 0..1 payment per booking |
| `payments_transaction_id_key` (unique) | payments | Prevent duplicate gateway settlements |
| `payments_status_idx` | payments | Filter payments by status |
| `payments_created_at_idx` | payments | Recent payments sort (DESC) |
| `otps_mobile_status_idx` | otps | Find active OTP for a mobile |
| `otps_expires_at_idx` | otps | Cleanup / expiry sweep jobs |

---

## Design Decisions

1. **Brand-new schema** — No SaaS models copied; Stage 2 placeholder removed.
2. **Amounts in paise (integer)** — Avoids floating-point money bugs; standard for INR.
3. **`paymentStatus` on Booking** — Denormalized for performant admin queries; synced with Payment in Stage 4+ service layer.
4. **`otpHash` not plain `otp`** — Security best practice; field maps to spec's "otp" concept.
5. **`onDelete: Restrict` on Payment** — Financial records must be explicitly handled before booking deletion.
6. **Extensibility** — Flat booking model can later gain `templeId`, `poojaTypeId`, or `festivalYear` columns without restructuring members/payments.

---

## Migration Commands

### `pnpm run db:generate` — Generate Prisma Client

Run after every schema change.

```powershell
pnpm run db:generate
```

**When:** Always, before building or running the app.

---

### `pnpm run db:migrate` — Create & apply migrations (development)

```powershell
pnpm run db:migrate
```

**When:** Day-to-day development after editing `schema.prisma`. Creates a new migration folder and applies it.

---

### `pnpm run db:migrate:deploy` — Apply migrations (CI / production)

```powershell
pnpm run db:migrate:deploy
```

**When:** Production deploys and CI pipelines. Applies pending migrations without prompting.

---

### `pnpm run db:push` — Push schema directly (dev shortcut)

```powershell
pnpm run db:push
```

**When:** Early prototyping only — **no migration history**. Do **not** use in production. Useful for quick local experiments; prefer `db:migrate` for anything you will deploy.

---

### `pnpm run db:studio` — Visual database browser

```powershell
pnpm run db:studio
```

**When:** Inspecting tables, verifying seed data, manual QA.

---

## Seed

### Environment variables (`.env.development`)

```env
ADMIN_SEED_MOBILE=9999999999
ADMIN_SEED_NAME=Temple Admin
```

No passwords are hardcoded — admin auth is OTP-based.

### Run

```powershell
pnpm run db:seed
```

### Expected output

```
Seeded default admin: Temple Admin (9999999999, ADMIN)
The seed command has been executed.
```

Safe to re-run — uses `upsert` on `mobile`.

---

## Stage 3 Checklist

- [x] Prisma schema created
- [x] Enums created
- [x] Relations verified
- [x] Indexes added
- [x] Constraints verified
- [x] Migration generated
- [x] Migration applied
- [x] Prisma Client generated
- [x] Seed executed
- [ ] Prisma Studio verified *(run locally)*

---

## Stage 3 Completion Verification

### 1. Commands

```powershell
pnpm run db:generate
pnpm exec dotenv -e .env.development -- prisma migrate status
pnpm run db:seed
pnpm run build
pnpm run db:studio
```

### 2. Expected terminal output

**migrate status:**

```
2 migrations found in prisma/migrations
Database schema is up to date!
```

**seed:**

```
Seeded default admin: Temple Admin (9999999999, ADMIN)
```

**build:** Exit code `0`

### 3. Expected PostgreSQL tables

| Table | Purpose |
|-------|---------|
| `_prisma_migrations` | Migration history |
| `admins` | Temple administrators |
| `bookings` | Devotee bookings |
| `booking_members` | Archana members |
| `payments` | Payment records |
| `otps` | Admin login OTPs |

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
ORDER BY tablename;
```

### 4. Expected foreign keys

| Child table | Column | Parent | On delete |
|-------------|--------|--------|-----------|
| `booking_members` | `booking_id` | `bookings.id` | CASCADE |
| `payments` | `booking_id` | `bookings.id` | RESTRICT |

```sql
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
```

### 5. Expected indexes

See [Indexes & Why They Exist](#indexes--why-they-exist) above.

```sql
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
```

### 6. Expected migration files

```
prisma/migrations/
├── migration_lock.toml
├── 20260804000000_init_temple_booking_schema/migration.sql
└── 20260804160000_stage3_schema_revision/migration.sql
```

### 7. Prisma Studio

1. Run `pnpm run db:studio`
2. Open `http://localhost:5555`
3. Confirm all 5 model tables exist
4. Click **Admin** — verify seeded row

### 8. Verify seeded Admin

```sql
SELECT id, name, mobile, role FROM admins;
```

Expected: one row — `Temple Admin`, mobile `9999999999`, role `ADMIN`.

### 9. Production-readiness checks

- [ ] All money fields are integers (paise), not floats
- [ ] OTP stored as hash, not plaintext
- [ ] Unique constraints on `bookingNumber`, `mobile` (admin), `transactionId`
- [ ] Foreign keys with appropriate cascade/restrict rules
- [ ] Timestamps on every model
- [ ] Enums constrain invalid domain values
- [ ] Migrations applied via `migrate deploy` (not `db push`) in production
- [ ] `pnpm run build` passes with generated client

---

## Next Stage

**Stage 4: Repository Layer** — Prisma data access wrappers with no business logic.
