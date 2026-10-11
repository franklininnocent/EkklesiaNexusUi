/** Customer-facing labels for catalog feature categories. */
const CATEGORY_LABELS: Record<string, string> = {
  people: 'Family and members',
  limits: 'Limits and capacity',
  finance: 'Donations and finances',
  reporting: 'Reports and analytics',
  ministries: 'Ministries and groups',
  pastoral: 'Pastoral care',
  governance: 'Governance',
  administration: 'Administration',
  communication: 'Communication',
  support: 'Support',
  enterprise: 'Enterprise and integrations',
  legacy: 'Legacy capabilities',
};

export function subscriptionFeatureCategoryLabel(category: string | null | undefined): string {
  if (!category) {
    return 'Other';
  }
  const key = category.toLowerCase();
  return CATEGORY_LABELS[key] ?? category.replace(/_/g, ' ');
}

export function groupByFeatureCategory<T extends { category: string; display_order?: number | null; name?: string }>(
  items: T[],
): { category: string; label: string; items: T[] }[] {
  const byCategory = new Map<string, T[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  return Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, groupItems]) => ({
      category,
      label: subscriptionFeatureCategoryLabel(category),
      items: [...groupItems].sort(
        (a, b) =>
          (a.display_order ?? 0) - (b.display_order ?? 0) ||
          (a.name ?? '').localeCompare(b.name ?? ''),
      ),
    }));
}
