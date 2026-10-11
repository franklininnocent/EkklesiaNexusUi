import {
  DEFAULT_MARKETING_OG_IMAGE,
  MARKETING_CANONICAL_ORIGINS,
  MARKETING_SEO_PAGE_IDS,
  MARKETING_SEO_PAGE_META,
  MarketingSeoPageId,
} from '../constants/marketing-seo.constants';

export type PublicPageSeoForm = {
  id: MarketingSeoPageId;
  name: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
};

export type MarketingSeoForm = {
  canonicalOrigin: string;
  defaultOgImage: string;
  organizationName: string;
  organizationDescription: string;
  googleVerification: string;
  bingVerification: string;
  ga4MeasurementId: string;
  pages: Record<MarketingSeoPageId, PublicPageSeoForm>;
};

export function defaultMarketingSeoForm(site?: {
  name?: string;
  seoTitle?: string;
  seoDescription?: string;
}): MarketingSeoForm {
  const title = site?.seoTitle ?? 'EkklesiaNexus';
  const description =
    site?.seoDescription ??
    'EkklesiaNexus is a complete Church Management System for parishes.';
  const orgName = site?.name ?? 'EkklesiaNexus';

  const pages = {} as Record<MarketingSeoPageId, PublicPageSeoForm>;
  for (const id of MARKETING_SEO_PAGE_IDS) {
    const meta = MARKETING_SEO_PAGE_META[id];
    const isHome = id === 'home';
    pages[id] = {
      id,
      name: meta.name,
      path: meta.path,
      seoTitle: isHome ? title : `${meta.name} — EkklesiaNexus`,
      seoDescription: isHome
        ? description
        : `${meta.name} information for the EkklesiaNexus marketing website.`,
      ogTitle: '',
      ogDescription: '',
      ogImage: DEFAULT_MARKETING_OG_IMAGE,
      robotsIndex: !meta.indexLockedNo,
      robotsFollow: !meta.indexLockedNo,
    };
  }

  return {
    canonicalOrigin: MARKETING_CANONICAL_ORIGINS[0],
    defaultOgImage: DEFAULT_MARKETING_OG_IMAGE,
    organizationName: orgName,
    organizationDescription: description,
    googleVerification: '',
    bingVerification: '',
    ga4MeasurementId: '',
    pages,
  };
}

export function seoFormFromPayload(payload: Record<string, unknown>): MarketingSeoForm {
  const site = (payload['site'] ?? {}) as Record<string, unknown>;
  const base = defaultMarketingSeoForm({
    name: String(site['name'] ?? ''),
    seoTitle: String(site['seoTitle'] ?? ''),
    seoDescription: String(site['seoDescription'] ?? ''),
  });

  const seo = payload['seo'];
  if (seo === null || typeof seo !== 'object' || Array.isArray(seo)) {
    return base;
  }

  const s = seo as Record<string, unknown>;
  if (typeof s['canonicalOrigin'] === 'string' && s['canonicalOrigin'].trim()) {
    base.canonicalOrigin = s['canonicalOrigin'].trim();
  }
  if (typeof s['defaultOgImage'] === 'string' && s['defaultOgImage'].trim()) {
    base.defaultOgImage = s['defaultOgImage'].trim();
  }
  if (typeof s['organizationName'] === 'string') {
    base.organizationName = s['organizationName'];
  }
  if (typeof s['organizationDescription'] === 'string') {
    base.organizationDescription = s['organizationDescription'];
  }

  const verification = s['verification'];
  if (verification !== null && typeof verification === 'object' && !Array.isArray(verification)) {
    const v = verification as Record<string, unknown>;
    if (typeof v['google'] === 'string') base.googleVerification = v['google'];
    if (typeof v['bing'] === 'string') base.bingVerification = v['bing'];
  }
  const analytics = s['analytics'];
  if (analytics !== null && typeof analytics === 'object' && !Array.isArray(analytics)) {
    const a = analytics as Record<string, unknown>;
    if (typeof a['ga4MeasurementId'] === 'string') {
      base.ga4MeasurementId = a['ga4MeasurementId'];
    }
  }

  const pages = s['pages'];
  if (pages !== null && typeof pages === 'object' && !Array.isArray(pages)) {
    const p = pages as Record<string, unknown>;
    for (const id of MARKETING_SEO_PAGE_IDS) {
      const row = p[id];
      if (row === null || typeof row !== 'object' || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      base.pages[id] = {
        ...base.pages[id],
        seoTitle: String(r['seoTitle'] ?? base.pages[id].seoTitle),
        seoDescription: String(r['seoDescription'] ?? base.pages[id].seoDescription),
        ogTitle: r['ogTitle'] != null ? String(r['ogTitle']) : '',
        ogDescription: r['ogDescription'] != null ? String(r['ogDescription']) : '',
        ogImage: String(r['ogImage'] ?? base.defaultOgImage),
        robotsIndex: Boolean(r['robotsIndex'] ?? base.pages[id].robotsIndex),
        robotsFollow: Boolean(r['robotsFollow'] ?? base.pages[id].robotsFollow),
      };
      if (MARKETING_SEO_PAGE_META[id].indexLockedNo) {
        base.pages[id].robotsIndex = false;
        base.pages[id].robotsFollow = false;
      }
    }
  }

  return base;
}

export function applySeoFormToPayload(
  payload: Record<string, unknown>,
  form: MarketingSeoForm,
): Record<string, unknown> {
  const next = { ...payload };
  const pages: Record<string, unknown> = {};
  for (const id of MARKETING_SEO_PAGE_IDS) {
    const page = form.pages[id];
    const locked = MARKETING_SEO_PAGE_META[id].indexLockedNo;
    pages[id] = {
      id,
      name: page.name,
      path: page.path,
      seoTitle: page.seoTitle.trim(),
      seoDescription: page.seoDescription.trim(),
      ...(page.ogTitle.trim() ? { ogTitle: page.ogTitle.trim() } : {}),
      ...(page.ogDescription.trim() ? { ogDescription: page.ogDescription.trim() } : {}),
      ogImage: page.ogImage.trim() || form.defaultOgImage,
      robotsIndex: locked ? false : page.robotsIndex,
      robotsFollow: locked ? false : page.robotsFollow,
    };
  }

  const seo: Record<string, unknown> = {
    schemaVersion: 1,
    canonicalOrigin: form.canonicalOrigin,
    defaultLocale: 'en',
    ogLocale: 'en_US',
    defaultOgImage: form.defaultOgImage.trim() || DEFAULT_MARKETING_OG_IMAGE,
    organizationName: form.organizationName.trim(),
    organizationDescription: form.organizationDescription.trim(),
    robots: { allowRoot: true },
    pages,
  };

  const verification: Record<string, string> = {};
  if (form.googleVerification.trim()) {
    verification['google'] = form.googleVerification.trim();
  }
  if (form.bingVerification.trim()) {
    verification['bing'] = form.bingVerification.trim();
  }
  if (Object.keys(verification).length > 0) {
    seo['verification'] = verification;
  }
  if (form.ga4MeasurementId.trim()) {
    seo['analytics'] = { ga4MeasurementId: form.ga4MeasurementId.trim() };
  }

  next['seo'] = seo;

  const site = next['site'];
  if (site !== null && typeof site === 'object' && !Array.isArray(site)) {
    const siteObj = { ...(site as Record<string, unknown>) };
    siteObj['seoTitle'] = form.pages.home.seoTitle.trim();
    siteObj['seoDescription'] = form.pages.home.seoDescription.trim();
    next['site'] = siteObj;
  }

  return next;
}
