export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PublishedMarketingContent {
  revision_id: number;
  schema_version: string;
  published_at: string | null;
  payload: Record<string, unknown>;
}

export interface PublishMarketingResult {
  revision_id: number;
  published_at: string | null;
}

export interface MarketingContentRevisionRow {
  id: number;
  schema_version: string;
  status: 'draft' | 'published';
  published_at: string | null;
  published_by: number | null;
  notes: string | null;
  created_at: string;
}

export interface MarketingContentDraft {
  revision_id: number;
  notes: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}
