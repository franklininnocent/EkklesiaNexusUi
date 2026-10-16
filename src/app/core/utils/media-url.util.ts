import { officialBrand } from '@core/config/official-brand';

export const MEDIA_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

export const MEDIA_IMAGE_MAX_BYTES_DEFAULT = 3 * 1024 * 1024;

export const MEDIA_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export interface SignedMediaUrls {
  displayUrl?: string | null;
  thumbUrl?: string | null;
}

const LOOPBACK_MEDIA_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function absoluteApiMediaPath(pathAndQuery: string): string {
  try {
    const origin = new URL(officialBrand.apiBaseUrl).origin;

    return `${origin}${pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`}`;
  } catch {
    return pathAndQuery;
  }
}

/**
 * Normalize signed media URLs for <img src>.
 * Local API hosts are rewritten to /api/... so `ng serve` can proxy them.
 * Any other absolute URL is left unchanged. The production app host does not
 * proxy /api, so rewriting https://api.ekklesianexus.com/... would load the
 * Angular page instead of the image.
 */
export function resolveMediaDisplaySrc(url?: string | null): string | null {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/api/') && LOOPBACK_MEDIA_HOSTS.has(parsed.hostname)) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }

    return trimmed;
  }

  if (trimmed.startsWith('/api/')) {
    return absoluteApiMediaPath(trimmed);
  }

  return trimmed;
}

export function resolveSignedDisplayUrl(
  source?: { profile_image_full_url?: string | null; photo_url?: string | null; logo_full_url?: string | null; patron_image_url?: string | null } | null
): string | null {
  const url =
    source?.profile_image_full_url ??
    source?.photo_url ??
    source?.logo_full_url ??
    source?.patron_image_url ??
    null;

  return resolveMediaDisplaySrc(url);
}

export function resolveSignedThumbUrl(
  source?: { profile_image_thumb_url?: string | null; photo_thumb_url?: string | null; logo_thumb_url?: string | null } | null
): string | null {
  const url = source?.profile_image_thumb_url ?? source?.photo_thumb_url ?? source?.logo_thumb_url ?? null;

  return url && url.trim() ? url.trim() : null;
}

export function validateMediaImageFile(file: File, maxBytes = MEDIA_IMAGE_MAX_BYTES_DEFAULT): string | null {
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
    return 'Please select a JPG, PNG, or WebP image.';
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return `Image must be ${maxMb} MB or smaller.`;
  }

  return null;
}
