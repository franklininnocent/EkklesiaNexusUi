import { officialBrand } from '../../../core/config/official-brand';

export const MARKETING_CANONICAL_ORIGINS = [
  officialBrand.websiteUrl,
  'http://localhost:3000',
  'http://localhost:3010',
] as const;

export const MARKETING_SEO_PAGE_IDS = ['home', 'privacy', 'terms'] as const;

export type MarketingSeoPageId = (typeof MARKETING_SEO_PAGE_IDS)[number];

export const MARKETING_SEO_PAGE_META: Record<
  MarketingSeoPageId,
  { name: string; path: string; indexLockedNo: boolean }
> = {
  home: { name: 'Homepage', path: '/', indexLockedNo: false },
  privacy: { name: 'Privacy', path: '/privacy', indexLockedNo: true },
  terms: { name: 'Terms', path: '/terms', indexLockedNo: true },
};

export const DEFAULT_MARKETING_OG_IMAGE = '/images/og/og-preview.png';
