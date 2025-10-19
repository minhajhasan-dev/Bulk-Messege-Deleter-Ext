import dayjs from 'dayjs';

export function formatDate(ts: number | string | Date, format = 'YYYY-MM-DD HH:mm') {
  return dayjs(ts).format(format);
}

export function daysBetween(a: Date, b: Date) {
  return Math.abs(dayjs(a).diff(b, 'day'));
}

export function addDays(date: Date, days: number) {
  return dayjs(date).add(days, 'day').toDate();
}

export function now() {
  return new Date();
}
