import { MARKETING_CANONICAL_ORIGINS } from '../constants/marketing-seo.constants';
import {
  applySeoFormToPayload,
  defaultMarketingSeoForm,
  duplicateSeoTitleWarnings,
  seoFormFromPayload,
} from './marketing-seo.models';

describe('marketing-seo.models', () => {
  it('uses the official website as the canonical origin', () => {
    expect(MARKETING_CANONICAL_ORIGINS[0]).toBe('https://ekklesianexus.com');
    expect(defaultMarketingSeoForm().canonicalOrigin).toBe('https://ekklesianexus.com');
  });

  it('applySeoFormToPayload syncs site seo fields from homepage', () => {
    const form = defaultMarketingSeoForm();
    form.pages.home.seoTitle = 'Custom title';
    form.pages.home.seoDescription = 'Custom description text for parishes.';

    const result = applySeoFormToPayload({ site: { name: 'EkklesiaNexus' } }, form);
    const site = result['site'] as Record<string, unknown>;
    expect(site['seoTitle']).toBe('Custom title');
    expect(result['seo']).toBeTruthy();
  });

  it('seoFormFromPayload preserves seo block', () => {
    const payload = {
      site: { seoTitle: 'A', seoDescription: 'B', name: 'EkklesiaNexus' },
      seo: {
        canonicalOrigin: 'https://ekklesianexus.com',
        pages: {
          home: {
            seoTitle: 'Home title',
            seoDescription: 'Home description for marketing.',
            robotsIndex: true,
            robotsFollow: true,
          },
        },
      },
    };
    const form = seoFormFromPayload(payload);
    expect(form.canonicalOrigin).toBe('https://ekklesianexus.com');
    expect(form.pages.home.seoTitle).toBe('Home title');
  });

  it('includes optional static page defaults', () => {
    const form = defaultMarketingSeoForm();
    expect(form.pages.features.path).toBe('/features');
    expect(form.pages.features.seoTitle).toContain('features');
  });

  it('flags duplicate SEO titles across pages', () => {
    const form = defaultMarketingSeoForm();
    form.pages.about.seoTitle = form.pages.home.seoTitle;
    const warnings = duplicateSeoTitleWarnings(form);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('applySeoFormToPayload writes optional page ids', () => {
    const form = defaultMarketingSeoForm();
    const result = applySeoFormToPayload({ site: { name: 'EkklesiaNexus' } }, form);
    const pages = (result['seo'] as Record<string, unknown>)['pages'] as Record<string, unknown>;
    expect(pages['features']).toBeTruthy();
  });
});
