/**
 * Actions wired to permission-aware UI.
 * Slugs match existing API middleware and controller checks.
 * An id that is not registered is denied.
 */
export type ActionGate = 'tenant' | 'user' | 'ecclesiastical';

export interface CatalogAction {
  /** Same string passed to allows() and *appCan. */
  id: string;
  slug: string;
  gate: ActionGate;
  /** Write, collect, approve, configure, or delete. Read-only support sessions cannot pass these. */
  mutates: boolean;
}

export const ACTION_CATALOG: Readonly<Record<string, CatalogAction>> = {
  'families.create': { id: 'families.create', slug: 'families.create', gate: 'tenant', mutates: true },
  'families.edit': { id: 'families.edit', slug: 'families.edit', gate: 'tenant', mutates: true },
  'families.delete': { id: 'families.delete', slug: 'families.delete', gate: 'tenant', mutates: true },

  'users.view': { id: 'users.view', slug: 'users.view', gate: 'user', mutates: false },
  'users.create': { id: 'users.create', slug: 'users.create', gate: 'user', mutates: true },
  'users.update': { id: 'users.update', slug: 'users.update', gate: 'user', mutates: true },
  'users.delete': { id: 'users.delete', slug: 'users.delete', gate: 'user', mutates: true },

  'sacraments.view': { id: 'sacraments.view', slug: 'sacraments.view', gate: 'tenant', mutates: false },
  'sacraments.create': { id: 'sacraments.create', slug: 'sacraments.create', gate: 'tenant', mutates: true },
  'sacraments.delete': { id: 'sacraments.delete', slug: 'sacraments.delete', gate: 'tenant', mutates: true },

  'bcc.create': { id: 'bcc.create', slug: 'bcc.create', gate: 'tenant', mutates: true },
  'bcc.delete': { id: 'bcc.delete', slug: 'bcc.delete', gate: 'tenant', mutates: true },

  'donations.collect': { id: 'donations.collect', slug: 'donations.collect', gate: 'tenant', mutates: true },
  'donations.manage': { id: 'donations.manage', slug: 'donations.manage', gate: 'tenant', mutates: true },
  'donations.approvals': { id: 'donations.approvals', slug: 'donations.approvals', gate: 'tenant', mutates: true },
  'donations.reports': { id: 'donations.reports', slug: 'donations.reports', gate: 'tenant', mutates: false },
  'donations.refund': { id: 'donations.refund', slug: 'donations.refund', gate: 'tenant', mutates: true },
  'donations.reverse': { id: 'donations.reverse', slug: 'donations.reverse', gate: 'tenant', mutates: true },
  'church.settings.edit': { id: 'church.settings.edit', slug: 'church.settings.edit', gate: 'tenant', mutates: true },

  'mass.intentions.create': {
    id: 'mass.intentions.create',
    slug: 'mass.intentions.create',
    gate: 'tenant',
    mutates: true,
  },
  'mass.intentions.schedule': {
    id: 'mass.intentions.schedule',
    slug: 'mass.intentions.schedule',
    gate: 'tenant',
    mutates: true,
  },
  'mass.intentions.fulfil': {
    id: 'mass.intentions.fulfil',
    slug: 'mass.intentions.fulfil',
    gate: 'tenant',
    mutates: true,
  },
  'mass.intentions.configure': {
    id: 'mass.intentions.configure',
    slug: 'mass.intentions.configure',
    gate: 'tenant',
    mutates: true,
  },

  'ministries.create': { id: 'ministries.create', slug: 'ministries.create', gate: 'tenant', mutates: true },
  'ministries.configure': { id: 'ministries.configure', slug: 'ministries.configure', gate: 'tenant', mutates: true },

  'bishops.create': { id: 'bishops.create', slug: 'bishops.create', gate: 'ecclesiastical', mutates: true },
  'bishops.update': { id: 'bishops.update', slug: 'bishops.update', gate: 'ecclesiastical', mutates: true },
  'bishops.archive': { id: 'bishops.archive', slug: 'bishops.archive', gate: 'ecclesiastical', mutates: true },
  'dioceses.create': { id: 'dioceses.create', slug: 'dioceses.create', gate: 'ecclesiastical', mutates: true },
  'dioceses.update': { id: 'dioceses.update', slug: 'dioceses.update', gate: 'ecclesiastical', mutates: true },
  'dioceses.delete': { id: 'dioceses.delete', slug: 'dioceses.delete', gate: 'ecclesiastical', mutates: true },
};

export function catalogAction(actionId: string): CatalogAction | null {
  return ACTION_CATALOG[actionId] ?? null;
}
