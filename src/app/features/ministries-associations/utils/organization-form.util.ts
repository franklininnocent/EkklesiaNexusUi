import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';

/**
 * Organization create/edit form group factory.
 *
 * Extracted so the "Add organization" page and the organization detail
 * page's inline "Edit profile" form share one FormGroup shape/validator
 * set instead of two hand-duplicated copies. Behavior is unchanged from
 * the original per-page definitions.
 */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** HTML date inputs require YYYY-MM-DD; APIs often return ISO-8601 datetimes. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value).trim());
  return match ? match[1] : '';
}

export function notFutureDateValidator(control: AbstractControl): ValidationErrors | null {
  const datePart = toDateInputValue(String(control.value ?? ''));
  if (!datePart) {
    return null;
  }
  if (datePart > todayIsoDate()) {
    return { futureDate: true };
  }
  return null;
}

/** Keep the organization's current category/type selectable even if it is inactive. */
export function mergeCurrentTaxonomy<T extends { id: string }>(
  list: T[],
  current: T | null | undefined,
): T[] {
  if (!current?.id) {
    return list;
  }
  if (list.some((item) => item.id === current.id)) {
    return list;
  }
  return [...list, current];
}

export function createOrganizationFormGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    code: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9-]+$/),
      ],
    ],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    short_name: ['', Validators.maxLength(50)],
    category_id: ['', Validators.required],
    type_id: ['', Validators.required],
    description: [''],
    vision: [''],
    mission: [''],
    objectives: [''],
    patron_saint: ['', Validators.maxLength(150)],
    established_date: ['', notFutureDateValidator],
    theme_color: ['', Validators.pattern(/^$|^#[0-9A-Fa-f]{6}$/)],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    phone: ['', Validators.maxLength(20)],
    website: ['', Validators.maxLength(500)],
    facebook: ['', Validators.maxLength(500)],
    instagram: ['', Validators.maxLength(500)],
    whatsapp: ['', Validators.maxLength(500)],
    youtube: ['', Validators.maxLength(500)],
    telegram: ['', Validators.maxLength(500)],
    status: ['active' as 'active' | 'inactive'],
    allow_multi_role_holding: [false],
    guests_can_hold_office: [false],
  });
}

export type OrganizationFormGroup = ReturnType<typeof createOrganizationFormGroup>;

export function mapOrganizationFieldMessage(field: string, message: string): string {
  const lower = message.toLowerCase();
  const isDuplicate = lower.includes('unique') || lower.includes('taken') || lower.includes('already');
  if (field === 'code' && isDuplicate) {
    return 'This code is already used.';
  }
  if (field === 'name' && isDuplicate) {
    return 'This name is already used.';
  }
  return message;
}
