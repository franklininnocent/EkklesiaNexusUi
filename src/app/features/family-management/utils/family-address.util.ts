import { Family } from '@core/models/family.model';

/** Normalize a single address segment (string or geographic relation object). */
export function formatAddressPart(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return null;
    }
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    const str = String(value).trim();
    return str || null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const name = record['name'];
    if (typeof name === 'string' && name.trim()) {
      return name.trim();
    }
  }
  const fallback = String(value).trim();
  return fallback === '[object Object]' ? null : fallback || null;
}

/** Join address parts for display; skips empty and [object Object] segments. */
export function joinAddressParts(...parts: unknown[]): string | null {
  const segments = parts
    .map((part) => formatAddressPart(part))
    .filter((part): part is string => !!part);
  return segments.length ? segments.join(', ') : null;
}

/** Clean legacy stored addresses that already contain [object Object]. */
export function sanitizeStoredAddressDisplay(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  const segments = value
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '[object Object]');
  return segments.length ? segments.join(', ') : null;
}

export function formatFamilyAddress(family: Family | null | undefined): string | null {
  if (!family) {
    return null;
  }
  return joinAddressParts(
    family.address_line_1,
    family.address_line_2,
    family.city,
    family.state?.name,
    family.postal_code
  );
}
