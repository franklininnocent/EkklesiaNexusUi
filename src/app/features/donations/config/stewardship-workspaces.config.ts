export type StewardshipWorkspaceId = 'leadership' | 'collect' | 'projects' | 'configure';

export interface StewardshipNavLink {
  path: string;
  label: string;
  exact?: boolean;
  description?: string;
  query?: Record<string, string>;
  /** Catalog action required to show this link. Omitted links stay with the donations module. */
  actionId?: string;
}

export interface StewardshipWorkspace {
  id: StewardshipWorkspaceId;
  label: string;
  hint: string;
  /** Screen label for the active workspace zone (executive vs operations vs config). */
  zone: string;
  links: StewardshipNavLink[];
}

export const STEWARDSHIP_WORKSPACES: StewardshipWorkspace[] = [
  {
    id: 'leadership',
    label: 'Dashboard',
    hint: 'Health & decisions',
    zone: 'Executive overview',
    links: [
      { path: '/donations', label: 'Overview', exact: true, description: 'Financial Operations Center' },
      { path: '/donations/expenses', label: 'Disbursements', description: 'Parish expense register', actionId: 'donations.manage' },
      { path: '/donations/reports', label: 'Reports', description: 'CSV exports and report previews', actionId: 'donations.reports' },
      { path: '/donations/notifications', label: 'Notifications', description: 'Outreach and reminders' },
      { path: '/donations/download-history', label: 'Download History', description: 'CSV exports requested for this parish' }
    ]
  },
  {
    id: 'collect',
    label: 'Collect payments',
    hint: 'Payments & receipts',
    zone: 'Operational collection',
    links: [
      { path: '/donations/collection-day', label: 'Collection Day', description: 'Live collection workspace', actionId: 'donations.collect' },
      { path: '/donations/today-collections', label: "Today's Collections", description: 'Day book for this business date' },
      { path: '/donations/payments', label: 'Payment Register', description: 'Full book of every payment' },
      { path: '/donations/register', label: "Today's Register", description: 'This business day’s collection log' },
      { path: '/donations/receipts', label: 'Receipts', description: 'Receipt hub and printing' },
      { path: '/donations/dues', label: 'Outstanding Contributions', description: 'Overdue and open balances' },
      { path: '/donations/donors', label: 'Donors', description: 'Contributor directory' }
    ]
  },
  {
    id: 'projects',
    label: 'Projects',
    hint: 'Funding progress',
    zone: 'Projects & funding',
    links: [
      { path: '/donations/projects', label: 'Building projects', description: 'Family instalments and money received' },
      { path: '/donations/campaigns', label: 'Campaigns', description: 'Parish target. Not a family bill.' },
      { path: '/donations/project-installments', label: 'Installments', description: 'Family instalments on a building project' }
    ]
  },
  {
    id: 'configure',
    label: 'Configure',
    hint: 'Plans & settings',
    zone: 'Configuration',
    links: [
      { path: '/donations/plans', label: 'Contribution Plans', description: 'Expected amounts for eligible families' },
      { path: '/donations/categories', label: 'Categories', description: 'Gift types for voluntary offerings' },
      { path: '/donations/register', label: 'Record a gift', description: 'Pledge or gift under a category', query: { record: '1' } },
      { path: '/donations/recurring', label: 'Recurring', description: 'Scheduled gifts' },
      { path: '/donations/approvals', label: 'Refunds', description: 'Refund approvals', actionId: 'donations.approvals' },
      { path: '/donations/history', label: 'History', description: 'Historical transactions' },
      { path: '/donations/settings', label: 'Settings', description: 'Stewardship configuration', actionId: 'church.settings.edit' }
    ]
  }
];

export function resolveStewardshipWorkspace(path: string): StewardshipWorkspaceId {
  if (matchesAny(path, [
    '/donations/payments',
    '/donations/register',
    '/donations/receipts',
    '/donations/collection-day',
    '/donations/today-collections',
    '/donations/dues',
    '/donations/donors'
  ])) {
    return 'collect';
  }
  if (matchesAny(path, ['/donations/projects', '/donations/campaigns', '/donations/project-installments'])) {
    return 'projects';
  }
  if (matchesAny(path, [
    '/donations/plans',
    '/donations/categories',
    '/donations/recurring',
    '/donations/approvals',
    '/donations/history',
    '/donations/settings'
  ])) {
    return 'configure';
  }
  return 'leadership';
}

function matchesAny(url: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`));
}
