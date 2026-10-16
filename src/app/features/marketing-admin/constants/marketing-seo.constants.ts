import { officialBrand } from '../../../core/config/official-brand';

export const MARKETING_CANONICAL_ORIGINS = [
  officialBrand.websiteUrl,
  'http://localhost:3000',
  'http://localhost:3010',
] as const;

/** Required on every published SEO payload (Laravel validator). */
export const MARKETING_SEO_REQUIRED_PAGE_IDS = ['home', 'privacy', 'terms'] as const;

/** Optional overrides for static Next.js routes (code defaults when omitted). */
export const MARKETING_SEO_OPTIONAL_PAGE_IDS = [
  'features',
  'about',
  'contact',
  'solutionsCatholicParishes',
] as const;

export const MARKETING_SEO_PAGE_IDS = [
  ...MARKETING_SEO_REQUIRED_PAGE_IDS,
  ...MARKETING_SEO_OPTIONAL_PAGE_IDS,
] as const;

export type MarketingSeoPageId = (typeof MARKETING_SEO_PAGE_IDS)[number];

export const MARKETING_SEO_PAGE_META: Record<
  MarketingSeoPageId,
  { name: string; path: string; indexLockedNo: boolean; optional?: boolean }
> = {
  home: { name: 'Homepage', path: '/', indexLockedNo: false },
  privacy: { name: 'Privacy', path: '/privacy', indexLockedNo: true },
  terms: { name: 'Terms', path: '/terms', indexLockedNo: true },
  features: {
    name: 'Features hub',
    path: '/features',
    indexLockedNo: false,
    optional: true,
  },
  about: { name: 'About', path: '/about', indexLockedNo: false, optional: true },
  contact: { name: 'Contact', path: '/contact', indexLockedNo: false, optional: true },
  solutionsCatholicParishes: {
    name: 'Catholic parishes solution',
    path: '/solutions/catholic-parishes',
    indexLockedNo: false,
    optional: true,
  },
};

export const DEFAULT_MARKETING_OG_IMAGE = '/images/og/og-preview.png';

/** Must match MarketingSeoValidator::SEO_DESCRIPTION_MAX_LENGTH. */
export const MARKETING_SEO_DESCRIPTION_MAX = 400;
