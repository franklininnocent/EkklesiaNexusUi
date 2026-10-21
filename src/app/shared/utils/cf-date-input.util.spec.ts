import {
  formatDateInput,
  formatDateTimeInput,
  formatMonthInput,
  isValidCalendarDate,
  parseDateInput,
  parseDateInputToIso,
  parseDateTimeInputToIso,
  parseMonthInputToIso,
} from './cf-date-input.util';

describe('cf-date-input.util', () => {
  describe('parseDateInput / formatDateInput', () => {
    it('parses required valid examples', () => {
      expect(parseDateInputToIso('21/10/2026')).toBe('2026-10-21');
      expect(parseDateInputToIso('05/03/2026')).toBe('2026-03-05');
      expect(parseDateInputToIso('31/12/2026')).toBe('2026-12-31');
      expect(parseDateInputToIso('29/02/2028')).toBe('2028-02-29');
    });

    it('rejects invalid calendar dates', () => {
      expect(parseDateInputToIso('31/04/2026')).toBeNull();
      expect(parseDateInputToIso('29/02/2027')).toBeNull();
      expect(parseDateInput('31/04/2026')).toBeNull();
    });

    it('formats ISO to DD/MM/YYYY', () => {
      expect(formatDateInput('2026-10-21')).toBe('21/10/2026');
      expect(formatDateInput('2026-03-05')).toBe('05/03/2026');
    });

    it('round-trips ISO hydrate', () => {
      const iso = '2026-10-21';
      expect(parseDateInputToIso(formatDateInput(iso))).toBe(iso);
    });

    it('returns null for empty or partial', () => {
      expect(parseDateInputToIso('')).toBeNull();
      expect(parseDateInputToIso('21/10')).toBeNull();
      expect(parseDateInputToIso('2026-10-21')).toBeNull();
    });
  });

  describe('isValidCalendarDate', () => {
    it('validates leap years', () => {
      expect(isValidCalendarDate(2028, 2, 29)).toBe(true);
      expect(isValidCalendarDate(2027, 2, 29)).toBe(false);
    });
  });

  describe('datetime', () => {
    it('parses and formats datetime', () => {
      expect(parseDateTimeInputToIso('21/10/2026 14:30')).toBe('2026-10-21T14:30');
      expect(formatDateTimeInput('2026-10-21T14:30')).toBe('21/10/2026 14:30');
    });

    it('rejects invalid time', () => {
      expect(parseDateTimeInputToIso('21/10/2026 25:00')).toBeNull();
    });
  });

  describe('month', () => {
    it('parses and formats month', () => {
      expect(parseMonthInputToIso('10/2026')).toBe('2026-10');
      expect(formatMonthInput('2026-10')).toBe('10/2026');
    });

    it('rejects invalid month', () => {
      expect(parseMonthInputToIso('13/2026')).toBeNull();
    });
  });
});
