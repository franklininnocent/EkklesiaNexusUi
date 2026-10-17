export type PlanCatalogReadiness = {
  live_plan_count: number;
  plan_codes: string[];
  blocking_errors: string[];
  warnings: string[];
  can_generate_preview: boolean;
};

export type PlanCatalogStatusOverview = {
  published: PlanCatalogRevisionSummary | null;
  draft: PlanCatalogRevisionSummary | null;
  readiness: PlanCatalogReadiness;
  live_fingerprint: string;
  published_fingerprint: string | null;
  draft_fingerprint: string | null;
  drift_from_published: boolean;
  drift_from_draft: boolean;
  live_plan_count: number;
  revalidate_status: string;
  revalidate_error: string | null;
};

export type PlanCatalogRevisionSummary = {
  id: number;
  revision_number: number;
  status: string;
  payload_hash: string;
  source_fingerprint: string;
  plan_count: number;
  plan_codes: string[];
  generated_at: string | null;
  published_at: string | null;
  validation_report?: { errors: string[]; warnings: string[] };
  hidden_feature_count?: number;
};

export type PlanCatalogRevisionRow = {
  id: number;
  revision_number: number;
  status: string;
  payload_hash: string;
  source_fingerprint: string;
  plan_count: number;
  generated_at: string | null;
  published_at: string | null;
  notes: string | null;
};

export type PlanCatalogVisibilityChange = {
  plan_code: string;
  feature_code: string;
  name: string;
};

export type PlanCatalogPublishDiff = {
  added: string[];
  removed: string[];
  changed: string[];
  plan_count: number;
  visibility?: {
    hidden: PlanCatalogVisibilityChange[];
    restored: PlanCatalogVisibilityChange[];
    plans?: { hidden: string[]; restored: string[] };
  };
  hidden_from_all?: string[];
};

export type PlanCatalogEditorFeature = {
  code: string;
  name: string;
  description: string | null;
  category: string;
  kind: 'feature' | 'limit';
  included: boolean;
  visible: boolean;
};

export type PlanCatalogPublicFeature = {
  code: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

export type PlanCatalogPublicLimit = {
  code: string;
  name: string;
  unit?: string | null;
  value: number | null;
  unlimited: boolean;
};

export type PlanCatalogEditorPlan = {
  code: string;
  name: string;
  listed: boolean;
  short_description?: string | null;
  badge_label?: string | null;
  pricing_type?: string | null;
  currency_code?: string | null;
  monthly_price?: string | null;
  annual_price?: string | null;
  billing_intervals?: string[];
  limits?: PlanCatalogPublicLimit[];
  visible_count: number;
  hidden_count: number;
  features: PlanCatalogEditorFeature[];
};

export type PlanCatalogRegionalPriceEntry = {
  monthly_price?: string | null;
  annual_price?: string | null;
};

export type PlanCatalogRegionalPrices = Partial<
  Record<'INR' | 'USD' | 'BRL', PlanCatalogRegionalPriceEntry>
>;

export type PlanCatalogRegionalPriceRow = {
  currency: 'INR' | 'USD' | 'BRL';
  label: string;
  monthly: string | null;
  annual: string | null;
};

export type PlanCatalogPublicPlan = {
  code: string;
  name: string;
  slug?: string;
  short_description?: string | null;
  badge_label?: string | null;
  is_featured?: boolean;
  pricing_type?: string;
  display_order?: number;
  currency_code?: string | null;
  monthly_price?: string | null;
  annual_price?: string | null;
  regional_prices?: PlanCatalogRegionalPrices;
  billing_intervals?: string[];
  trial_days?: number | null;
  limits?: PlanCatalogPublicLimit[];
  features?: PlanCatalogPublicFeature[];
  coverage?: Array<PlanCatalogPublicFeature & { included?: boolean; feature_type?: string }>;
};

export type PlanCatalogFeatureVisibilityEditor = {
  revision_id: number;
  revision_number: number;
  status: string;
  payload_hash: string;
  editable: boolean;
  plans: PlanCatalogEditorPlan[];
  hidden: Record<string, string[]>;
  hidden_plans: string[];
  hidden_from_all: string[];
  changes_from_published: {
    hidden: PlanCatalogVisibilityChange[];
    restored: PlanCatalogVisibilityChange[];
    plans?: { hidden: string[]; restored: string[] };
  };
  public_payload: PlanCatalogPublicPlan[];
};

export type PlanCatalogPreviewToken = {
  token: string;
  expires_at: string;
  preview_path: string;
  preview_url: string | null;
};
