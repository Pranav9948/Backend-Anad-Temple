export function convertUTCToIST(date: Date | string | null) {
  if (!date) return null;

  const d = new Date(date);

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

const IST_TIMEZONE = 'Asia/Kolkata';

function getISTDateParts(referenceDate: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

function istDateToUtcStart(year: number, month: number, day: number): Date {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return new Date(`${year}-${paddedMonth}-${paddedDay}T00:00:00+05:30`);
}

function istDateToUtcEnd(year: number, month: number, day: number): Date {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return new Date(`${year}-${paddedMonth}-${paddedDay}T23:59:59.999+05:30`);
}

export function getISTDayBounds(referenceDate = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getISTDateParts(referenceDate);
  return {
    start: istDateToUtcStart(year, month, day),
    end: istDateToUtcEnd(year, month, day),
  };
}

export function getISTWeekBounds(referenceDate = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getISTDateParts(referenceDate);
  const anchor = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+05:30`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
  }).format(anchor);

  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const startAnchor = new Date(anchor);
  startAnchor.setUTCDate(startAnchor.getUTCDate() - weekdayIndex);

  const startParts = getISTDateParts(startAnchor);
  const endAnchor = new Date(startAnchor);
  endAnchor.setUTCDate(endAnchor.getUTCDate() + 6);
  const endParts = getISTDateParts(endAnchor);

  return {
    start: istDateToUtcStart(startParts.year, startParts.month, startParts.day),
    end: istDateToUtcEnd(endParts.year, endParts.month, endParts.day),
  };
}

export function getISTMonthBounds(referenceDate = new Date()): { start: Date; end: Date } {
  const { year, month } = getISTDateParts(referenceDate);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: istDateToUtcStart(year, month, 1),
    end: istDateToUtcEnd(year, month, lastDay),
  };
}

export type RevenuePeriod = 'today' | 'week' | 'month' | 'custom';

export function resolveRevenueDateRange(input: {
  period?: RevenuePeriod;
  dateFrom?: Date;
  dateTo?: Date;
}): { start: Date; end: Date } {
  if (input.period === 'today') {
    return getISTDayBounds();
  }

  if (input.period === 'week') {
    return getISTWeekBounds();
  }

  if (input.period === 'month') {
    return getISTMonthBounds();
  }

  if (input.dateFrom && input.dateTo) {
    if (input.dateFrom > input.dateTo) {
      throw new Error('dateFrom must be before or equal to dateTo');
    }
    return { start: input.dateFrom, end: input.dateTo };
  }

  return getISTDayBounds();
}
