export interface MonthGridDay {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: string;
}

export const DEFAULT_TIME_STEP = 15;

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateInputValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDateInputDisplay(value: string, locale: string): string {
  const parsed = parseDateInputValue(value);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
}

export function getMonthStart(date: Date): Date {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addMonths(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function getWeekStart(date: Date, weekStartsOnMonday = true): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = weekStartsOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function formatDateKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function formatMonthKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  });
  return formatter.format(date);
}

export function formatWeekdayLabel(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone }).format(date);
}

export function formatMonthLabel(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone }).format(date);
}

export function buildMonthLabels(locale: string, timeZone: string): string[] {
  const labels: string[] = [];
  for (let month = 0; month < 12; month += 1) {
    const date = new Date(2020, month, 1);
    labels.push(new Intl.DateTimeFormat(locale, { month: 'long', timeZone }).format(date));
  }
  return labels;
}

export function formatDayNumber(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone }).format(date);
}

export function buildMonthGrid(
  viewDate: Date,
  timeZone: string,
  locale: string,
  weekStartsOnMonday = true,
): MonthGridDay[] {
  const start = getWeekStart(getMonthStart(viewDate), weekStartsOnMonday);
  const currentMonthKey = formatMonthKey(viewDate, timeZone);
  const todayKey = formatDateKey(new Date(), timeZone);
  const grid: MonthGridDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = formatDateKey(date, timeZone);
    const monthKey = formatMonthKey(date, timeZone);
    grid.push({
      date,
      key,
      isCurrentMonth: monthKey === currentMonthKey,
      isToday: key === todayKey,
      dayNumber: formatDayNumber(date, locale, timeZone),
    });
  }

  return grid;
}

export function buildTimeOptions(stepMinutes = DEFAULT_TIME_STEP): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      options.push(value);
    }
  }
  return options;
}

export function buildTimeLabels(locale: string): string[] {
  const labels: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const date = new Date(2020, 0, 1, hour, 0);
    labels.push(
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(
        date,
      ),
    );
  }
  return labels;
}

export function combineDateAndTime(dateValue: string, timeValue: string): Date | null {
  if (!dateValue || !timeValue) return null;
  const dateTime = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }
  return dateTime;
}

export function combineDateAndTimeInTimeZone(
  dateValue: string,
  timeValue: string,
  timeZone: string,
): Date | null {
  if (!dateValue || !timeValue) return null;
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));
  const [hour, minute] = timeValue.split(':').map((part) => Number(part));
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const utcCandidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  if (Number.isNaN(utcCandidate.getTime())) return null;
  const offsetMinutes = getTimeZoneOffsetMinutes(utcCandidate, timeZone);
  if (Number.isNaN(offsetMinutes)) return null;
  const result = new Date(utcCandidate.getTime() - offsetMinutes * 60_000);
  if (Number.isNaN(result.getTime())) return null;
  return result;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const year = lookup('year');
  const month = lookup('month');
  const day = lookup('day');
  const hour = lookup('hour');
  const minute = lookup('minute');
  const second = lookup('second');
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtc - date.getTime()) / 60000;
}
