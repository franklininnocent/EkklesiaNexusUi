import {
  applyStructureToPayload,
  finalCtaFromPayload,
  navigationFromPayload,
} from './marketing-structure.models';

describe('marketing-structure.models', () => {
  it('round-trips navigation through payload', () => {
    const payload = {
      navigation: [{ label: 'Contact', href: '#contact' }],
      footer: { statement: 'EkklesiaNexus', links: [{ label: 'Privacy', href: '/privacy' }] },
    };
    const items = navigationFromPayload(payload);
    expect(items).toHaveLength(1);
    const merged = applyStructureToPayload({}, items, {
      statement: 'Footer copy',
      links: [{ label: 'Terms', href: '/terms' }],
    });
    expect(merged['navigation']).toEqual([{ label: 'Contact', href: '#contact' }]);
    expect((merged['footer'] as { links: unknown[] }).links).toHaveLength(1);
  });

  it('round-trips final CTA through payload', () => {
    const payload = {
      finalCta: {
        title: 'Ready?',
        description: 'Talk to us.',
        ctas: [{ label: 'Contact', href: '#contact' }],
      },
    };
    const form = finalCtaFromPayload(payload);
    expect(form.title).toBe('Ready?');
    expect(form.ctaHref).toBe('#contact');
    const merged = applyStructureToPayload({}, [], { statement: '', links: [] }, form);
    expect(merged['finalCta']).toEqual({
      title: 'Ready?',
      description: 'Talk to us.',
      ctas: [{ label: 'Contact', href: '#contact', variant: 'primary' }],
    });
  });
});
