/**
 * Explicit day-first form input parsing/formatting for date, datetime, and month fields.
 * Wire values stay ISO (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`, `YYYY-MM`); visible text is DD/MM/YYYY.
 */

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const DATE_INPUT = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MONTH_INPUT = /^(\d{2})\/(\d{4})$/;
const DATETIME_INPUT = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;

export interface CalendarYmd {
  y: number;
  m: number;
  d: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** True when day exists on the calendar (leap years included). */
export function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return false;
  }
  if (m < 1 || m > 12 || d < 1) {
    return false;
  }
  return d <= daysInMonth(y, m);
}

export function isoDateFromParts(y: number, m: number, d: number): string | null {
  if (!isValidCalendarDate(y, m, d)) {
    return null;
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function partsFromIsoDate(iso: string | null | undefined): CalendarYmd | null {
  if (!iso || typeof iso !== 'string') {
    return null;
  }
  const trimmed = iso.trim();
  const match = trimmed.match(ISO_DATE_ONLY);
  if (!match) {
    if (trimmed.includes('T')) {
      return partsFromIsoDate(trimmed.split('T')[0]);
    }
    if (trimmed.includes(' ')) {
      return partsFromIsoDate(trimmed.split(' ')[0]);
    }
    return null;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return isValidCalendarDate(y, m, d) ? { y, m, d } : null;
}

/** `2026-10-21` → `21/10/2026` */
export function formatDateInput(isoYmd: string | null | undefined): string {
  const parts = partsFromIsoDate(isoYmd);
  if (!parts) {
    return '';
  }
  return `${pad2(parts.d)}/${pad2(parts.m)}/${parts.y}`;
}

/** Parse complete `DD/MM/YYYY` text; never uses `Date.parse` on slash strings. */
export function parseDateInput(text: string | null | undefined): CalendarYmd | null {
  if (text === null || text === undefined) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(DATE_INPUT);
  if (!match) {
    return null;
  }
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  return isValidCalendarDate(y, m, d) ? { y, m, d } : null;
}

export function parseDateInputToIso(text: string | null | undefined): string | null {
  const parts = parseDateInput(text);
  return parts ? isoDateFromParts(parts.y, parts.m, parts.d) : null;
}

export function normalizeIsoDateInput(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const parts = partsFromIsoDate(value);
  return parts ? isoDateFromParts(parts.y, parts.m, parts.d)! : '';
}

/** Compare ISO date-only strings (lexicographic works for YYYY-MM-DD). */
export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isIsoDateInRange(iso: string, min?: string | null, max?: string | null): boolean {
  if (min && compareIsoDates(iso, min) < 0) {
    return false;
  }
  if (max && compareIsoDates(iso, max) > 0) {
    return false;
  }
  return true;
}

/** `2026-10-21T14:30` → `21/10/2026 14:30` */
export function formatDateTimeInput(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) {
    return '';
  }
  const datePart = formatDateInput(match[1]);
  if (!datePart) {
    return '';
  }
  return `${datePart} ${match[2]}`;
}

/** Parse `DD/MM/YYYY HH:mm` → `YYYY-MM-DDTHH:mm` */
export function parseDateTimeInputToIso(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(DATETIME_INPUT);
  if (!match) {
    return null;
  }
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const hh = Number(match[4]);
  const mm = Number(match[5]);
  if (!isValidCalendarDate(y, m, d)) {
    return null;
  }
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  const isoDate = isoDateFromParts(y, m, d);
  if (!isoDate) {
    return null;
  }
  return `${isoDate}T${pad2(hh)}:${pad2(mm)}`;
}

/** `2026-10` → `10/2026` */
export function formatMonthInput(isoYm: string | null | undefined): string {
  if (!isoYm || typeof isoYm !== 'string') {
    return '';
  }
  const match = isoYm.trim().match(ISO_MONTH);
  if (!match) {
    return '';
  }
  const m = Number(match[2]);
  const y = Number(match[1]);
  if (m < 1 || m > 12) {
    return '';
  }
  return `${pad2(m)}/${y}`;
}

/** Parse `MM/YYYY` → `YYYY-MM` */
export function parseMonthInputToIso(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(MONTH_INPUT);
  if (!match) {
    return null;
  }
  const m = Number(match[1]);
  const y = Number(match[2]);
  if (m < 1 || m > 12 || y < 1 || y > 9999) {
    return null;
  }
  return `${y}-${pad2(m)}`;
}

export const CF_DATE_INPUT_PLACEHOLDER = 'DD/MM/YYYY';
export const CF_DATETIME_INPUT_PLACEHOLDER = 'DD/MM/YYYY HH:mm';
export const CF_MONTH_INPUT_PLACEHOLDER = 'MM/YYYY';
