import { FormControl, FormGroup } from '@angular/forms';
import { dateWindowValidator, applyServerValidation, getErrorMessage } from './form-validation.helper';

describe('dateWindowValidator', () => {
  const buildForm = (starts: string, ends: string) =>
    new FormGroup(
      {
        starts_at: new FormControl(starts),
        ends_at: new FormControl(ends),
      },
      { validators: [dateWindowValidator('starts_at', 'ends_at')] }
    );

  it('accepts when end is after start', () => {
    const form = buildForm('2026-09-10T10:00', '2026-09-10T11:00');
    expect(form.valid).toBe(true);
  });

  it('rejects when end equals start', () => {
    const form = buildForm('2026-09-10T10:00', '2026-09-10T10:00');
    expect(form.hasError('startsAfterEnds')).toBe(true);
  });

  it('rejects when end is before start', () => {
    const form = buildForm('2026-09-10T10:00', '2026-09-10T09:00');
    expect(form.hasError('startsAfterEnds')).toBe(true);
  });

  it('skips validation when either side is empty', () => {
    const form = buildForm('', '2026-09-10T11:00');
    expect(form.hasError('startsAfterEnds')).toBe(false);
  });
});

describe('server and required validation messages', () => {
  it('asks for the field in plain language', () => {
    const form = new FormGroup({
      email: new FormControl('', { validators: [] }),
    });
    form.get('email')?.setErrors({ required: true });
    form.get('email')?.markAsTouched();
    expect(getErrorMessage('email', form)).toBe('Enter the email address.');
  });

  it('shows the backend message on the matching control and keeps the entered value', () => {
    const form = new FormGroup({
      amount: new FormControl('0'),
      email: new FormControl('ada@parish.test'),
    });

    applyServerValidation(form, {
      amount: ['Enter an amount greater than zero.'],
    });

    expect(form.get('amount')?.value).toBe('0');
    expect(form.get('email')?.value).toBe('ada@parish.test');
    expect(getErrorMessage('amount', form)).toBe('Enter an amount greater than zero.');
  });
});
