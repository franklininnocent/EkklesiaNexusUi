import { FamilyMember } from '@core/models/family.model';
import {
  mapFamilyMemberToFormValue,
  normalizeFormDateInput,
} from './map-family-member-to-form-value.util';

describe('normalizeFormDateInput', () => {
  it('returns YYYY-MM-DD from ISO timestamp', () => {
    expect(normalizeFormDateInput('2000-12-25T00:00:00.000Z')).toBe('2000-12-25');
  });

  it('returns empty for null', () => {
    expect(normalizeFormDateInput(null)).toBe('');
  });
});

describe('mapFamilyMemberToFormValue', () => {
  const base = (): FamilyMember =>
    ({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      first_name: 'John',
      last_name: 'Snowden',
      relationship_to_head: 'self',
      marital_status: 'married',
    }) as FamilyMember;

  it('maps marriage_date for edit modal', () => {
    const value = mapFamilyMemberToFormValue({
      ...base(),
      marriage_date: '2000-12-25',
    });
    expect(value.marriage_date).toBe('2000-12-25');
    expect(value.marital_status).toBe('married');
  });

  it('prefers stored marriage_date over suggested_marriage_date', () => {
    const value = mapFamilyMemberToFormValue({
      ...base(),
      marriage_date: '2000-12-25',
      suggested_marriage_date: '1999-01-01',
    });
    expect(value.marriage_date).toBe('2000-12-25');
  });

  it('falls back to suggested_marriage_date when marriage_date is empty', () => {
    const value = mapFamilyMemberToFormValue({
      ...base(),
      marriage_date: undefined,
      suggested_marriage_date: '2011-02-03',
      marriage_date_conflict: true,
    });
    expect(value.marriage_date).toBe('2011-02-03');
    expect(value.marriage_date_conflict).toBe(true);
  });

  it('maps baptism and confirmation dates', () => {
    const value = mapFamilyMemberToFormValue({
      ...base(),
      baptism_date: '1985-06-01',
      baptism_church_name: 'St. Mary',
      confirmation_date: '1998-05-10',
      confirmation_place: 'Cathedral',
      first_communion_date: '1990-04-15',
    });
    expect(value.baptism_date).toBe('1985-06-01');
    expect(value.baptism_church_name).toBe('St. Mary');
    expect(value.confirmation_date).toBe('1998-05-10');
    expect(value.confirmation_place).toBe('Cathedral');
    expect(value.first_communion_date).toBe('1990-04-15');
  });
});
