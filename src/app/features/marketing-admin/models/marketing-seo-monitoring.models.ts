export type SeoCheckStatus = 'passed' | 'failed' | 'not_run' | 'error';
export type SeoCheckSource = 'cms' | 'production_http';
export type SeoCheckSeverity = 'critical' | 'warning' | 'info' | 'none';
export type SeoFreshness = 'fresh' | 'stale' | 'unknown';

export interface SeoMonitoringCheck {
  check_id: string;
  source: SeoCheckSource;
  severity: SeoCheckSeverity;
  status: SeoCheckStatus;
  checked_at: string | null;
  message: string;
  evidence: string;
  remediation: string;
  url?: string | null;
  freshness?: SeoFreshness;
  finding_id?: string;
}

export interface SeoMonitoringSummaryCounts {
  passed: number;
  failed: number;
  not_run: number;
  error: number;
}

export interface SeoMonitoringSummary {
  cms: SeoMonitoringSummaryCounts;
  production_http: SeoMonitoringSummaryCounts;
  open_findings_by_severity: { critical: number; warning: number; info: number };
}

export interface SeoMonitoringSnapshotSection {
  scan_id?: string | null;
  status?: string | null;
  completed_at?: string | null;
  last_successful_scan_at?: string | null;
  never_run?: boolean;
  published_content_fingerprint?: string | null;
  summary?: SeoMonitoringSummary | SeoMonitoringSummaryCounts;
  checks?: SeoMonitoringCheck[];
  findings?: SeoMonitoringCheck[];
  freshness?: SeoFreshness;
}

export interface SeoMonitoringSnapshot {
  schema_version: number;
  snapshot_label: string;
  domain: string;
  config_fingerprint: string;
  published_content_fingerprint: string | null;
  cms: SeoMonitoringSnapshotSection | null;
  production: SeoMonitoringSnapshotSection;
  last_failed_attempt: {
    scan_id?: string;
    status?: string;
    error_summary?: string;
    completed_at?: string;
  } | null;
  snapshot_unavailable: boolean;
}

export interface SeoMonitoringScanResult {
  scan_id: string;
  scan_kind: string;
  status: string;
  started_at: string;
  completed_at: string;
  include_production: boolean;
  checks: SeoMonitoringCheck[];
  findings: SeoMonitoringCheck[];
  summary: SeoMonitoringSummary;
}
