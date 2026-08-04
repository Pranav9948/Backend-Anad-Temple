# Stage 10 — Admin Dashboard APIs

Authenticated REST APIs for the Temple Admin Dashboard. All endpoints require a valid admin JWT except public auth routes under `/admin/auth`.

---

## Dashboard Architecture

```
Route (/api/v1/admin/*)
    ↓
authenticate + requireAdmin middleware
    ↓
Controller (thin)
    ↓
AdminDashboardService / AdminBookingService
    ↓
BookingRepository / PaymentRepository
    ↓
Prisma → PostgreSQL
```

WhatsApp notifications on manual payment update reuse Stage 8 `NotificationService` — no duplicated notification logic.

---

## Security

| Layer | Protection |
|-------|------------|
| `authenticate` | Validates Bearer JWT access token |
| `requireAdmin` | Confirms admin record exists in database |
| Missing token | `401 Unauthorized` |
| Invalid/expired token | `401 Unauthorized` |
| Admin not found | `401 Unauthorized` |

JWT secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

Tokens and OTP values are never logged.

---

## API Documentation

Base path: `/api/v1/admin`  
Authentication: `Authorization: Bearer <accessToken>` (all routes below)

---

### GET /dashboard

Dashboard summary statistics.

**Response** `200`

```json
{
  "success": true,
  "data": {
    "totalBookings": 42,
    "totalPaidBookings": 30,
    "totalUnpaidBookings": 12,
    "totalRevenue": 210000,
    "paidRevenue": 150000,
    "pendingRevenue": 60000,
    "today": {
      "bookings": 5,
      "revenue": 25000,
      "paidRevenue": 20000,
      "pendingRevenue": 5000
    }
  }
}
```

All amounts are in **paise** (INR).

---

### GET /revenue

Revenue summary with optional filters.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `period` | `today` \| `week` \| `month` \| `custom` | Date range preset (default: `today`) |
| `dateFrom` | ISO datetime | Required when `period=custom` |
| `dateTo` | ISO datetime | Required when `period=custom` |
| `paymentStatus` | `PENDING` \| `PAID` \| `FAILED` | Filter bookings |
| `language` | Language enum | Filter bookings |

**Response** `200`

```json
{
  "success": true,
  "data": {
    "totalRevenue": 25000,
    "paidRevenue": 20000,
    "pendingRevenue": 5000,
    "bookingCount": 5,
    "paidCount": 4,
    "pendingCount": 1
  }
}
```

---

### GET /bookings

Paginated booking list with search, filters, and sorting.

**Query parameters**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Page size (max 100) |
| `search` | — | Booking number, devotee name, or mobile |
| `paymentStatus` | — | `PENDING`, `PAID`, `FAILED` |
| `language` | — | Language enum |
| `dateFrom` | — | ISO datetime |
| `dateTo` | — | ISO datetime |
| `sort` / `sortBy` | `createdAt` | `createdAt`, `devoteeName`, `bookingNumber`, `amount` |
| `sortOrder` | `desc` | `asc` or `desc` |

**Response** `200`

```json
{
  "success": true,
  "data": {
    "items": [ { "id": "...", "bookingNumber": "TB-2026-...", ... } ],
    "pagination": {
      "totalRecords": 42,
      "totalPages": 3,
      "currentPage": 1,
      "pageSize": 20
    }
  }
}
```

---

### GET /bookings/paid

Paid bookings only. Supports `page`, `limit`, `sort`, `sortOrder`.

---

### GET /bookings/unpaid

Unpaid (PENDING) bookings only. Supports `page`, `limit`, `sort`, `sortOrder`.

---

### GET /bookings/:bookingId

Complete booking details.

**Response** `200`

```json
{
  "success": true,
  "data": {
    "booking": { "...": "..." },
    "members": [ { "personName": "...", "nakshatra": "ROHINI" } ],
    "payment": { "status": "PENDING", "gatewayOrderId": "...", ... }
  }
}
```

**Errors:** `404` if booking not found.

---

### PATCH /bookings/:bookingId

Update booking fields (admin correction).

**Request**

```json
{
  "devoteeName": "Updated Name",
  "mobile": "9876543210",
  "notes": "Admin note"
}
```

Payment identifiers cannot be modified via this endpoint.

---

### PATCH /bookings/:bookingId/payment

Manually update payment status.

**Request**

```json
{
  "paymentStatus": "PAID"
}
```

Allowed values: `PAID`, `PENDING`

**When set to PAID:**
- Booking `paymentStatus` → `PAID`
- Payment record created/updated (cash if new)
- WhatsApp payment success notification sent (best-effort)

**When set to PENDING:**
- Booking `paymentStatus` → `PENDING`
- Payment record status → `PENDING`, `paidAt` cleared

---

## Dashboard Data — Metric Calculations

| Metric | Calculation |
|--------|-------------|
| Total Bookings | Count of all bookings |
| Total Paid Bookings | Count where `paymentStatus = PAID` |
| Total Unpaid Bookings | Count where `paymentStatus = PENDING` |
| Total Revenue | Sum of `totalAmount` for all bookings |
| Paid Revenue | Sum of `totalAmount` where `paymentStatus = PAID` |
| Pending Revenue | Sum of `totalAmount` where `paymentStatus = PENDING` |
| Today's Bookings | Count where `createdAt` is within today (IST) |
| Today's Revenue | Sum of `totalAmount` for today's bookings (IST) |

Today's boundaries use **Asia/Kolkata** timezone.

---

## Pagination Format

All list endpoints return:

```json
{
  "items": [],
  "pagination": {
    "totalRecords": 100,
    "totalPages": 5,
    "currentPage": 1,
    "pageSize": 20
  }
}
```

---

## Filtering

Repository-level Prisma `where` clauses — data is never loaded entirely into memory.

| Filter | Field |
|--------|-------|
| Search | `bookingNumber`, `devoteeName`, `mobileNumber` (case-insensitive for text) |
| Payment status | `paymentStatus` |
| Language | `language` |
| Date range | `createdAt` between `dateFrom` and `dateTo` |

---

## Revenue Calculation

| Metric | Formula |
|--------|---------|
| Total Revenue | `SUM(booking.totalAmount)` in range |
| Paid Revenue | `SUM(totalAmount)` where status = PAID |
| Pending Revenue | `SUM(totalAmount)` where status = PENDING |

Uses Prisma `aggregate` with parallel queries — no N+1.

---

## Folder Structure (After Stage 10)

```
src/modules/admin/
├── admin-auth.service.ts
├── admin-auth.controller.ts
├── admin-booking.service.ts
├── admin-booking.controller.ts
├── admin-dashboard.service.ts
├── admin-dashboard.controller.ts
├── admin-dashboard.mapper.ts
├── admin-dashboard.validation.ts
├── admin.mapper.ts
├── admin.service.ts
└── admin.repository.ts

src/routes/v1/
├── admin.routes.ts          # Protected dashboard routes
└── admin-auth.routes.ts     # Public OTP auth

src/middlewares/
└── auth.middleware.ts       # authenticate + requireAdmin

src/utils/
├── pagination.util.ts
└── date.util.ts             # IST date range helpers
```

---

## Stage 10 Checklist

- [x] Dashboard API created
- [x] Booking List API created
- [x] Booking Details API created
- [x] Update Booking API created
- [x] Paid Bookings API created
- [x] Unpaid Bookings API created
- [x] Payment Update API created
- [x] Revenue API created
- [x] Pagination implemented
- [x] Filtering implemented
- [x] Sorting implemented
- [x] JWT protection verified
- [x] Validation completed
- [x] Build successful

---

## Verification

### 1. Build

```bash
pnpm run build
```

### 2. Start server

```bash
pnpm run dev
```

### 3. Authentication

```bash
# No token → 401
curl http://localhost:7777/api/v1/admin/dashboard

# Login (Stage 9)
curl -X POST http://localhost:7777/api/v1/admin/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9020602727"}'

curl -X POST http://localhost:7777/api/v1/admin/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9020602727","otp":"<devOtp>"}'
```

### 4. Dashboard

```bash
curl http://localhost:7777/api/v1/admin/dashboard \
  -H "Authorization: Bearer <accessToken>"
```

### 5. Booking list with filters

```bash
curl "http://localhost:7777/api/v1/admin/bookings?page=1&limit=10&search=TB&paymentStatus=PENDING" \
  -H "Authorization: Bearer <accessToken>"
```

### 6. Manual payment update

```bash
curl -X PATCH http://localhost:7777/api/v1/admin/bookings/<bookingId>/payment \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"paymentStatus":"PAID"}'
```

### 7. Revenue

```bash
curl "http://localhost:7777/api/v1/admin/revenue?period=month" \
  -H "Authorization: Bearer <accessToken>"
```

---

## Remaining Tasks Before Production

- Stage 11: OpenAPI/Swagger docs, integration tests, security hardening
- Stage 12: Production deployment, SSL, backups, monitoring
- Connect frontend admin dashboard to these APIs

**Not implemented:** Frontend, Excel/PDF export, analytics charts, multi-temple support.
