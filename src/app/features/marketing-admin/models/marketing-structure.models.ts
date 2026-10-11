export type NavItemForm = {
  label: string;
  href: string;
};

export type FooterForm = {
  statement: string;
  links: NavItemForm[];
};

export type FinalCtaForm = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export function navigationFromPayload(payload: Record<string, unknown>): NavItemForm[] {
  const navigation = payload['navigation'];
  if (!Array.isArray(navigation)) {
    return [];
  }
  return navigation
    .filter((row) => row !== null && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        label: String(r['label'] ?? ''),
        href: String(r['href'] ?? ''),
      };
    });
}

export function footerFromPayload(payload: Record<string, unknown>): FooterForm {
  const footer = payload['footer'];
  if (footer === null || typeof footer !== 'object' || Array.isArray(footer)) {
    return { statement: '', links: [] };
  }
  const f = footer as Record<string, unknown>;
  const linksRaw = f['links'];
  const links = Array.isArray(linksRaw)
    ? linksRaw
        .filter((row) => row !== null && typeof row === 'object' && !Array.isArray(row))
        .map((row) => {
          const r = row as Record<string, unknown>;
          return { label: String(r['label'] ?? ''), href: String(r['href'] ?? '') };
        })
    : [];
  return {
    statement: String(f['statement'] ?? ''),
    links,
  };
}

export function finalCtaFromPayload(payload: Record<string, unknown>): FinalCtaForm {
  const finalCta = payload['finalCta'];
  if (finalCta === null || typeof finalCta !== 'object' || Array.isArray(finalCta)) {
    return { title: '', description: '', ctaLabel: '', ctaHref: '#contact' };
  }
  const f = finalCta as Record<string, unknown>;
  const ctas = Array.isArray(f['ctas']) ? f['ctas'] : [];
  const first = ctas[0] !== null && typeof ctas[0] === 'object' ? (ctas[0] as Record<string, unknown>) : {};
  return {
    title: String(f['title'] ?? ''),
    description: String(f['description'] ?? ''),
    ctaLabel: String(first['label'] ?? 'Request a Demo'),
    ctaHref: String(first['href'] ?? '#contact'),
  };
}

export function applyStructureToPayload(
  payload: Record<string, unknown>,
  navigation: NavItemForm[],
  footer: FooterForm,
  finalCta?: FinalCtaForm,
): Record<string, unknown> {
  const next = { ...payload };
  next['navigation'] = navigation.map((row) => ({
    label: row.label.trim(),
    href: row.href.trim(),
  }));
  next['footer'] = {
    statement: footer.statement.trim(),
    links: footer.links.map((row) => ({
      label: row.label.trim(),
      href: row.href.trim(),
    })),
  };
  if (finalCta) {
    next['finalCta'] = {
      title: finalCta.title.trim(),
      description: finalCta.description.trim(),
      ctas: [
        {
          label: finalCta.ctaLabel.trim() || 'Request a Demo',
          href: finalCta.ctaHref.trim() || '#contact',
          variant: 'primary',
        },
      ],
    };
  }
  return next;
}
