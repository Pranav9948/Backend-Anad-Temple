# Stage 8 — WhatsApp Integration

Modular WhatsApp notification system for the Temple Vinayaka Chathurthi Ganapathi Homam booking backend. Sends admin alerts when bookings are completed and when payment status changes.

---

## Notification Architecture

```
Controller
    ↓
Service (Booking / Payment)
    ↓
Notification Service
    ↓
WhatsApp Provider (interface)
    ↓
Meta WhatsApp Cloud API
```

| Layer | Responsibility |
|-------|----------------|
| **Controller** | HTTP only — never sends WhatsApp messages |
| **Booking / Payment Service** | Business logic; triggers notifications after success |
| **Notification Service** | Templates, retry, logging, best-effort delivery |
| **WhatsApp Provider** | Provider abstraction (`IWhatsAppProvider`) |
| **Meta Provider** | Meta Cloud API HTTP client |

Business logic never calls the Meta API directly. Swap providers by changing `WHATSAPP_PROVIDER` and adding a new provider class.

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHATSAPP_PROVIDER` | No | `META` | Active WhatsApp provider |
| `WHATSAPP_ACCESS_TOKEN` | Yes | — | Meta Cloud API permanent/temporary access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | — | Phone number ID from Meta Business Suite |
| `WHATSAPP_VERIFY_TOKEN` | No | — | Reserved for future webhook verification |
| `TEMPLE_ADMIN_WHATSAPP_NUMBER` | Yes | — | Admin recipient (country code + number, digits only, e.g. `919999999999`) |
| `WHATSAPP_RETRY_MAX_ATTEMPTS` | No | `3` | Max send attempts per notification |
| `WHATSAPP_RETRY_DELAY_MS` | No | `1000` | Delay between retry attempts (ms) |

All required variables are validated at startup via Zod in `src/core/env.ts`. The application **fails fast** if any required variable is missing.

Example (`.env.development`):

```env
WHATSAPP_PROVIDER=META
WHATSAPP_ACCESS_TOKEN=EAAxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=my_verify_token
TEMPLE_ADMIN_WHATSAPP_NUMBER=919876543210
WHATSAPP_RETRY_MAX_ATTEMPTS=3
WHATSAPP_RETRY_DELAY_MS=1000
```

---

## Notification Flow

### Booking Completed (Checkout)

```
Devotee completes checkout (with or without payment)
        ↓
BookingService.checkoutWithoutPayment()
        ↓
NotificationService.notifyBookingCreated()
        ↓
MetaWhatsAppProvider.sendTextMessage()
        ↓
Temple Admin WhatsApp
```

Triggered when checkout succeeds in the public booking flow (after members are added). Also triggered by `createBooking()` when a full booking is created in one transaction.

### Payment Success

```
Payment verified (API or webhook)
        ↓
PaymentService.completePayment() / handlePaymentCaptured()
        ↓
NotificationService.notifyPaymentSuccess()
        ↓
Temple Admin WhatsApp
```

### Payment Failed

```
Payment failure (API or webhook)
        ↓
PaymentService.markPaymentFailed()
        ↓
NotificationService.notifyPaymentFailed()
        ↓
Temple Admin WhatsApp
```

---

## Templates

All message text lives in `src/modules/notification/notification.templates.ts`.

### Booking Created

```
🛕 *New Temple Booking*

*Booking Number:* TB-2026-XXXXXX
*Devotee Name:* ...
*Mobile Number:* ...
*Language:* English
*Archana Members:* 2
*Payment Status:* PENDING
*Booking Time:* DD/MM/YYYY, HH:MM:SS
```

### Payment Success

```
✅ *Payment Received*

*Booking Number:* TB-2026-XXXXXX
*Amount:* ₹500.00
*Payment Method:* Online (Razorpay)
*Payment ID:* pay_xxxxxxxx
*Payment Status:* PAID
*Transaction Time:* DD/MM/YYYY, HH:MM:SS
```

### Payment Failed

```
❌ *Payment Failed*

*Booking Number:* TB-2026-XXXXXX
*Devotee Name:* ...
*Mobile Number:* ...
*Failure Status:* FAILED
```

---

## Retry Strategy

The Notification Service retries failed sends:

1. Attempt send via provider
2. On failure, wait `WHATSAPP_RETRY_DELAY_MS`
3. Retry up to `WHATSAPP_RETRY_MAX_ATTEMPTS` times
4. Log each retry attempt
5. Log final failure after all attempts exhausted

Retries apply only within the notification layer. Booking and payment operations are never retried because of WhatsApp failures.

---

## Error Handling

Notifications are **best-effort**:

- WhatsApp API failures are caught inside `NotificationService`
- Errors are logged; they are **never thrown** to callers
- Booking creation, checkout, and payment verification **always succeed** even if WhatsApp is down
- Services use `void notificationService.notify...()` — fire-and-forget
- Access tokens are never logged (Pino redaction configured)

---

## Provider Abstraction

```typescript
interface IWhatsAppProvider {
  sendTextMessage(to: string, body: string): Promise<void>;
}
```

Current implementation: `MetaWhatsAppProvider` (`src/modules/notification/meta.provider.ts`)

Future providers (Twilio, Interakt, AiSensy, WATI) implement the same interface and are selected via `WHATSAPP_PROVIDER`.

---

## Future-Ready (Not Implemented)

The `INotificationService` interface supports adding later:

- User booking confirmation
- User payment receipt
- Daily booking summary
- Festival reminders

These are not implemented in Stage 8.

---

## Folder Structure (After Stage 8)

```
src/modules/notification/
├── notification.constants.ts   # Provider names, retry defaults
├── notification.service.ts     # Orchestration, retry, logging
├── notification.templates.ts   # Message templates
├── notification.types.ts         # Interfaces and payload types
├── whatsapp.provider.ts          # IWhatsAppProvider export
└── meta.provider.ts              # Meta Cloud API implementation
```

Updated files:

```
src/core/env.ts                   # WhatsApp env validation
src/core/logger.ts                # Token redaction
src/modules/booking/booking.service.ts   # Checkout notification trigger
src/modules/payment/payment.service.ts   # Payment notification triggers
src/services/index.ts             # Notification service export
```

---

## Stage 8 Checklist

- [x] Notification module created
- [x] Notification Service created
- [x] WhatsApp Provider interface created
- [x] Meta WhatsApp provider implemented
- [x] Booking notification implemented (on checkout)
- [x] Payment success notification implemented
- [x] Payment failure notification implemented
- [x] Environment variables added
- [x] Retry mechanism implemented
- [x] Logging implemented
- [x] TypeScript compilation successful

---

## Stage 8 Completion Verification

### 1. Build

```bash
pnpm run build
```

Expected: no TypeScript errors.

### 2. Start Server

```bash
pnpm run dev
```

Expected: server starts, database connects, notification module initializes (no separate boot step — provider is lazy on first send).

### 3. Environment Validation

Remove `WHATSAPP_ACCESS_TOKEN` and restart. Expected: application exits with validation error.

Confirm these are required:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `TEMPLE_ADMIN_WHATSAPP_NUMBER`

### 4. Booking Notification Test

Complete the public booking flow:

1. `POST /api/v1/bookings` — create booking
2. `POST /api/v1/bookings/:id/members` — add member(s)
3. `POST /api/v1/bookings/:id/checkout` — checkout without payment

Expected:

- Temple Admin receives WhatsApp with booking number, devotee name, mobile, member count, payment status
- Checkout API returns `200` even if WhatsApp fails

### 5. Payment Success Test

Complete a successful Razorpay test payment and verify:

```bash
POST /api/v1/payments/verify
```

Expected:

- Admin receives payment success WhatsApp (amount, payment ID, transaction time)
- Payment record and booking status updated to `PAID`

### 6. Payment Failure Test

Simulate failed payment (Razorpay test failure or webhook `payment.failed`).

Expected:

- Admin receives failure notification
- Booking `paymentStatus` remains `PENDING` per business rules

### 7. Failure Handling

Set an invalid `WHATSAPP_ACCESS_TOKEN` and create a booking + checkout.

Expected:

- Booking/checkout API succeeds
- Payment processing succeeds
- Error logged: `WhatsApp notification failed after retries`
- Application does not crash

### 8. Retry Verification

With invalid token, observe logs during checkout.

Expected:

- `WhatsApp notification requested`
- `WhatsApp notification attempt failed — retrying` (up to 2 times for 3 attempts)
- `WhatsApp notification failed after retries`

### 9. Architecture Validation

- [ ] Services call `notificationService`, not Meta API
- [ ] Controllers never send WhatsApp messages
- [ ] Notification logic isolated in `src/modules/notification/`
- [ ] Provider replaceable via `IWhatsAppProvider`

### 10. Final Readiness Check

**Stage 8 is complete** when build passes, env validation works, notifications fire on checkout/payment events, and failures never block booking or payment.

#### Remaining Tasks Before Stage 9

- Configure real Meta WhatsApp Cloud API credentials
- Add admin phone number to Meta test recipient list (sandbox mode)
- End-to-end test with live WhatsApp delivery
- Register production webhook verify token when inbound WhatsApp webhooks are needed

**Not in scope for Stage 8:** Admin Authentication, Admin Dashboard, Revenue APIs, user WhatsApp notifications, SMS, Email.
