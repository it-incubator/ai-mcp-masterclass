import dayjs from 'dayjs';
import type { Currency } from '../api/types';

const fmtCache = new Map<string, Intl.NumberFormat>();

/** en-US currency format, e.g. "$1,234.50", "€2,500.00", "£0.00". */
export function formatMoney(amount: number | string | null | undefined, currency: Currency | string): string {
  let f = fmtCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    fmtCache.set(currency, f);
  }
  return f.format(Number(amount ?? 0));
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('YYYY-MM-DD HH:mm') : '';
}

export function startOfDayIso(date: string): string {
  return dayjs(date).startOf('day').toISOString();
}

export function endOfDayIso(date: string): string {
  return dayjs(date).endOf('day').toISOString();
}
