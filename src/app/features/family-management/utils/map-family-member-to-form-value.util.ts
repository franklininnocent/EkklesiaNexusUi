import { FamilyMember } from '@core/models/family.model';
import { FamilyMemberFormValue } from '../components/family-member-form-modal/family-member-form-modal.component';

/** Normalize API date strings for HTML `type="date"` (YYYY-MM-DD, no timezone shift). */
export function normalizeFormDateInput(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  if (trimmed.includes(' ')) {
    return trimmed.split(' ')[0];
  }
  return trimmed;
}

/**
 * Maps a {@link FamilyMember} API model into {@link FamilyMemberFormValue} for the member modal.
 * Keeps sacramental profile fields aligned with family-form member patching.
 */
export function mapFamilyMemberToFormValue(member: FamilyMember): FamilyMemberFormValue {
  const marriageDate =
    normalizeFormDateInput(member.marriage_date) ||
    normalizeFormDateInput(member.suggested_marriage_date ?? undefined);

  return {
    id: member.id ? String(member.id).trim() : null,
    person_id: member.person_id
      ? String(member.person_id).trim()
      : member.person?.id
        ? String(member.person.id).trim()
        : null,
    first_name: member.first_name || '',
    middle_name: member.middle_name || '',
    last_name: member.last_name || '',
    date_of_birth: normalizeFormDateInput(member.date_of_birth),
    gender: member.gender || '',
    relationship_to_head: member.relationship_to_head || 'other',
    marital_status: member.marital_status || 'single',
    phone: member.phone || '',
    email: member.email || '',
    occupation: member.occupation || '',
    education: member.education || '',
    father_person_id: member.person?.father_person_id ?? member.father_person_id ?? null,
    father_name: member.display_father_name ?? member.father_name ?? member.person?.father_name ?? null,
    mother_person_id: member.person?.mother_person_id ?? member.mother_person_id ?? null,
    mother_name: member.display_mother_name ?? member.mother_name ?? member.person?.mother_name ?? null,
    baptism_date: normalizeFormDateInput(member.baptism_date),
    baptism_place: member.baptism_place || '',
    baptism_godparent_primary: member.baptism_godparent_primary || '',
    baptism_godparent_secondary: member.baptism_godparent_secondary || '',
    baptism_location_type: member.baptism_location_type || 'home_parish',
    baptism_church_name: member.baptism_church_name || '',
    baptism_church_address: member.baptism_church_address || '',
    baptism_priest_name: member.baptism_priest_name || '',
    baptism_priest_is_home: member.baptism_priest_is_home ?? true,
    first_communion_date: normalizeFormDateInput(member.first_communion_date),
    first_communion_place: member.first_communion_place || '',
    confirmation_date: normalizeFormDateInput(member.confirmation_date),
    confirmation_place: member.confirmation_place || '',
    marriage_date: marriageDate,
    marriage_place: member.marriage_place || '',
    marriage_spouse_name: member.marriage_spouse_name || member.linked_spouse_name || '',
    suggested_marriage_date: member.suggested_marriage_date ?? null,
    marriage_date_conflict: member.marriage_date_conflict ?? false,
    marriage_bride_full_name: member.marriage_bride_full_name || '',
    marriage_bride_address: member.marriage_bride_address || '',
    marriage_bride_church_type: member.marriage_bride_church_type || 'home_parish',
    marriage_bride_church_name: member.marriage_bride_church_name || '',
    marriage_bride_church_address: member.marriage_bride_church_address || '',
    marriage_groom_full_name: member.marriage_groom_full_name || '',
    marriage_groom_address: member.marriage_groom_address || '',
    marriage_groom_church_type: member.marriage_groom_church_type || 'home_parish',
    marriage_groom_church_name: member.marriage_groom_church_name || '',
    marriage_groom_church_address: member.marriage_groom_church_address || '',
    status: member.status || 'active',
  };
}
