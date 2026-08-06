import type { Language } from '@/generated/prisma/client.js';
import { convertUTCToIST } from '@/utils/date.util.js';
import type {
  BookingCreatedNotificationPayload,
  EmailMessage,
  PaymentFailedNotificationPayload,
  PaymentSuccessNotificationPayload,
} from '@/modules/notification/notification.types.js';

const LANGUAGE_LABELS: Record<Language, string> = {
  ENGLISH: 'English',
  MALAYALAM: 'Malayalam',
  TAMIL: 'Tamil',
  TELUGU: 'Telugu',
  HINDI: 'Hindi',
  KANNADA: 'Kannada',
};

const BRAND = {
  amber600: '#d97706',
  amber700: '#b45309',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  stone50: '#fafaf9',
  stone100: '#f5f5f4',
  stone200: '#e7e5e4',
  stone500: '#78716c',
  stone700: '#44403c',
  stone900: '#1c1917',
  white: '#ffffff',
  emerald50: '#ecfdf5',
  emerald700: '#047857',
  red50: '#fef2f2',
  red700: '#b91c1c',
};

export function formatAmountInr(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatPaymentMethod(method: string): string {
  if (method === 'CASH') return 'Cash / Offline at temple';
  return method;
}

export function formatNakshatraLabel(nakshatra: string): string {
  return nakshatra
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.stone200}; color: ${BRAND.stone500}; font-size: 13px; width: 42%; vertical-align: top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.stone200}; color: ${BRAND.stone900}; font-size: 14px; font-weight: 600; text-align: right; vertical-align: top;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function statusBadge(
  label: string,
  tone: 'pending' | 'success' | 'danger' = 'pending',
): string {
  const styles =
    tone === 'success'
      ? `background:${BRAND.emerald50};color:${BRAND.emerald700};`
      : tone === 'danger'
        ? `background:${BRAND.red50};color:${BRAND.red700};`
        : `background:${BRAND.amber100};color:${BRAND.amber700};`;

  return `
    <span style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;${styles}">
      ${escapeHtml(label)}
    </span>
  `;
}

function sectionTitle(title: string): string {
  return `
    <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.amber700};">
      ${escapeHtml(title)}
    </p>
  `;
}

function wrapEmailLayout(options: {
  eyebrow: string;
  title: string;
  subtitle: string;
  bodyHtml: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.stone100};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.stone100};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.stone200};">
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.amber700}, ${BRAND.amber600});padding:28px 28px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#fde68a;">
                ${escapeHtml(options.eyebrow)}
              </p>
              <h1 style="margin:0;font-size:26px;line-height:1.25;color:${BRAND.white};font-weight:700;">
                ${escapeHtml(options.title)}
              </h1>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#fff7ed;">
                ${escapeHtml(options.subtitle)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#fbbf24,#f59e0b,#b45309);"></td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.stone900};">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;background:${BRAND.stone50};border-top:1px solid ${BRAND.stone200};text-align:center;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.stone500};">
                Anad Sree Chamundi Devi Temple<br />
                Nedumangad, Thiruvananthapuram, Kerala
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function membersTable(
  members: BookingCreatedNotificationPayload['members'],
): string {
  if (members.length === 0) {
    return `
      <p style="margin:0;padding:14px 16px;background:${BRAND.stone50};border:1px dashed ${BRAND.stone200};border-radius:10px;color:${BRAND.stone500};font-size:14px;">
        No Archana members listed
      </p>
    `;
  }

  const rows = members
    .map(
      (member, index) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid ${BRAND.stone200};color:${BRAND.stone500};font-size:13px;width:40px;">
          ${index + 1}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${BRAND.stone200};color:${BRAND.stone900};font-size:14px;font-weight:600;">
          ${escapeHtml(member.name)}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${BRAND.stone200};color:${BRAND.amber700};font-size:13px;font-weight:600;text-align:right;">
          ${escapeHtml(formatNakshatraLabel(member.nakshatra))}
        </td>
      </tr>
    `,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${BRAND.stone200};border-radius:12px;overflow:hidden;background:${BRAND.white};">
      <tr style="background:${BRAND.amber50};">
        <td style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber700};">#</td>
        <td style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber700};">Name</td>
        <td style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber700};text-align:right;">Nakshatra</td>
      </tr>
      ${rows}
    </table>
  `;
}

export function buildBookingCreatedMessage(
  payload: BookingCreatedNotificationPayload,
): EmailMessage {
  const bookingTime =
    convertUTCToIST(payload.bookingTime) ?? payload.bookingTime.toISOString();
  const amount =
    typeof payload.totalAmountPaise === 'number'
      ? formatAmountInr(payload.totalAmountPaise)
      : null;

  const memberTextLines =
    payload.members.length > 0
      ? payload.members.map(
          (member, index) =>
            `${index + 1}. ${member.name} — ${formatNakshatraLabel(member.nakshatra)}`,
        )
      : ['No Archana members listed'];

  const text = [
    'New Temple Booking',
    'New Ganapathi Homam booking received.',
    '',
    `Booking Number: ${payload.bookingNumber}`,
    `Devotee Name: ${payload.devoteeName}`,
    `Mobile Number: ${payload.mobileNumber}`,
    `Language: ${LANGUAGE_LABELS[payload.language]}`,
    `Archana Members: ${payload.memberCount}`,
    ...memberTextLines,
    ...(amount ? [`Total Amount: ${amount}`] : []),
    `Payment Status: ${payload.paymentStatus}`,
    `Booking Time: ${bookingTime}`,
  ].join('\n');

  const bodyHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:14px 16px;background:${BRAND.amber50};border:1px solid ${BRAND.amber100};border-radius:12px;">
          <p style="margin:0 0 4px;font-size:12px;color:${BRAND.stone500};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Booking Number</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND.amber700};letter-spacing:0.02em;">${escapeHtml(payload.bookingNumber)}</p>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:24px;">
      ${sectionTitle('Devotee Details')}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${detailRow('Devotee Name', payload.devoteeName)}
        ${detailRow('Mobile Number', payload.mobileNumber)}
        ${detailRow('Language', LANGUAGE_LABELS[payload.language])}
        ${detailRow('Booking Time', bookingTime)}
      </table>
    </div>

    <div style="margin-bottom:24px;">
      ${sectionTitle(`Archana Members (${payload.memberCount})`)}
      ${membersTable(payload.members)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg, ${BRAND.amber50}, ${BRAND.stone50});border:1px solid ${BRAND.amber100};border-radius:14px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.stone500};">Total Amount</p>
                <p style="margin:0;font-size:28px;font-weight:700;color:${BRAND.stone900};">${escapeHtml(amount ?? '—')}</p>
              </td>
              <td style="vertical-align:middle;text-align:right;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.stone500};">Payment</p>
                ${statusBadge(payload.paymentStatus, 'pending')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `New Temple Booking · ${payload.bookingNumber}`,
    text,
    html: wrapEmailLayout({
      eyebrow: 'Anad Chamundi Temple',
      title: 'New Temple Booking',
      subtitle: 'Ganapathi Homam booking received — please review details below.',
      bodyHtml,
    }),
  };
}

export function buildPaymentSuccessMessage(
  payload: PaymentSuccessNotificationPayload,
): EmailMessage {
  const transactionTime =
    convertUTCToIST(payload.transactionTime) ??
    payload.transactionTime.toISOString();

  const text = [
    'Payment Received',
    'Payment was received for a temple booking.',
    '',
    `Booking Number: ${payload.bookingNumber}`,
    `Amount: ${formatAmountInr(payload.amountPaise)}`,
    `Payment Method: ${formatPaymentMethod(payload.paymentMethod)}`,
    `Payment ID: ${payload.paymentId}`,
    'Payment Status: PAID',
    `Transaction Time: ${transactionTime}`,
  ].join('\n');

  const bodyHtml = `
    <div style="margin-bottom:20px;text-align:center;">
      ${statusBadge('PAID', 'success')}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${detailRow('Booking Number', payload.bookingNumber)}
      ${detailRow('Amount', formatAmountInr(payload.amountPaise))}
      ${detailRow('Payment Method', formatPaymentMethod(payload.paymentMethod))}
      ${detailRow('Payment ID', payload.paymentId)}
      ${detailRow('Transaction Time', transactionTime)}
    </table>
  `;

  return {
    subject: `Payment Received · ${payload.bookingNumber}`,
    text,
    html: wrapEmailLayout({
      eyebrow: 'Anad Chamundi Temple',
      title: 'Payment Received',
      subtitle: 'A temple booking payment was completed successfully.',
      bodyHtml,
    }),
  };
}

export function buildPaymentFailedMessage(
  payload: PaymentFailedNotificationPayload,
): EmailMessage {
  const text = [
    'Payment Failed',
    'A temple booking payment failed.',
    '',
    `Booking Number: ${payload.bookingNumber}`,
    `Devotee Name: ${payload.devoteeName}`,
    `Mobile Number: ${payload.mobileNumber}`,
    `Failure Status: ${payload.failureStatus}`,
  ].join('\n');

  const bodyHtml = `
    <div style="margin-bottom:20px;text-align:center;">
      ${statusBadge(payload.failureStatus, 'danger')}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${detailRow('Booking Number', payload.bookingNumber)}
      ${detailRow('Devotee Name', payload.devoteeName)}
      ${detailRow('Mobile Number', payload.mobileNumber)}
      ${detailRow('Failure Status', payload.failureStatus)}
    </table>
  `;

  return {
    subject: `Payment Failed · ${payload.bookingNumber}`,
    text,
    html: wrapEmailLayout({
      eyebrow: 'Anad Chamundi Temple',
      title: 'Payment Failed',
      subtitle: 'A temple booking payment could not be completed.',
      bodyHtml,
    }),
  };
}

export function buildAdminOtpMessage(
  otp: string,
  expiryMinutes: number,
): EmailMessage {
  const text = [
    'Temple Admin Login OTP',
    'Your temple admin login OTP is below.',
    '',
    `OTP: ${otp}`,
    `Valid for ${expiryMinutes} minutes.`,
    '',
    'Do not share this code with anyone.',
  ].join('\n');

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.stone700};">
      Use this one-time password to sign in to the temple admin panel.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td align="center" style="padding:22px;background:${BRAND.amber50};border:1px solid ${BRAND.amber100};border-radius:14px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.stone500};">OTP</p>
          <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.28em;color:${BRAND.amber700};">${escapeHtml(otp)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:${BRAND.stone500};text-align:center;">
      Valid for ${expiryMinutes} minutes. Do not share this code with anyone.
    </p>
  `;

  return {
    subject: 'Temple Admin Login OTP',
    text,
    html: wrapEmailLayout({
      eyebrow: 'Anad Chamundi Temple',
      title: 'Admin Login OTP',
      subtitle: 'Secure access code for temple administration.',
      bodyHtml,
    }),
  };
}
