import { FormBuilder } from '@angular/forms';
import { richTextToPayload } from '@shared/components/rich-text/rich-text.utils';
import {
  createOrganizationFormGroup,
  mergeCurrentTaxonomy,
  notFutureDateValidator,
  toDateInputValue,
  todayIsoDate,
} from './organization-form.util';

describe('organization-form.util', () => {
  it('normalizes ISO datetimes for date inputs', () => {
    expect(toDateInputValue('1976-12-30T00:00:00.000000Z')).toBe('1976-12-30');
    expect(toDateInputValue('2026-10-17')).toBe('2026-10-17');
    expect(toDateInputValue(null)).toBe('');
  });

  it('does not treat today ISO datetimes as future dates', () => {
    const today = todayIsoDate();
    const control = { value: `${today}T00:00:00.000000Z` } as { value: string };
    expect(notFutureDateValidator(control as never)).toBeNull();
  });

  it('keeps the current taxonomy option when it is missing from the active list', () => {
    const current = { id: 'cat-2', name: 'Parish' };
    expect(mergeCurrentTaxonomy([{ id: 'cat-1', name: 'Ministry' }], current)).toEqual([
      { id: 'cat-1', name: 'Ministry' },
      current,
    ]);
    expect(mergeCurrentTaxonomy([current], current)).toEqual([current]);
  });

  it('maps About rich-text values into the update payload shape', () => {
    const form = createOrganizationFormGroup(new FormBuilder());
    form.patchValue({
      code: 'CHOIR',
      name: 'Parish Choir',
      category_id: 'cat-1',
      type_id: 'type-1',
      description: '<p>Description text</p>',
      vision: '<p>Vision text</p>',
      mission: '<p>Mission text</p>',
      objectives: '<p>Objectives text</p>',
    });
    const raw = form.getRawValue();
    expect(richTextToPayload(raw.description)).toBe('<p>Description text</p>');
    expect(richTextToPayload(raw.vision)).toBe('<p>Vision text</p>');
    expect(richTextToPayload(raw.mission)).toBe('<p>Mission text</p>');
    expect(richTextToPayload(raw.objectives)).toBe('<p>Objectives text</p>');
    expect(form.valid).toBe(true);
  });
});
