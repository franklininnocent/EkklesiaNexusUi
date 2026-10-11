import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiEnvelope } from '../models/marketing-admin.models';
import {
  PlanCatalogFeatureVisibilityEditor,
  PlanCatalogPreviewToken,
  PlanCatalogPublishDiff,
  PlanCatalogRevisionRow,
  PlanCatalogStatusOverview,
} from '../models/marketing-plan-catalog.models';

@Injectable({ providedIn: 'root' })
export class MarketingPlanCatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/marketing/plan-catalog`;

  getStatus(): Observable<PlanCatalogStatusOverview> {
    return this.http
      .get<ApiEnvelope<PlanCatalogStatusOverview>>(`${this.base}/status`)
      .pipe(map((body) => body.data!));
  }

  listRevisions(): Observable<PlanCatalogRevisionRow[]> {
    return this.http
      .get<ApiEnvelope<PlanCatalogRevisionRow[]>>(`${this.base}/revisions`)
      .pipe(map((body) => body.data ?? []));
  }

  generatePreview(notes?: string): Observable<{ revision_id: number; payload_hash: string }> {
    return this.http
      .post<ApiEnvelope<{ revision_id: number; payload_hash: string }>>(`${this.base}/previews`, {
        notes: notes?.trim() || undefined,
      })
      .pipe(map((body) => body.data!));
  }

  validateRevision(revisionId: number): Observable<{ errors: string[]; warnings: string[] }> {
    return this.http
      .post<ApiEnvelope<{ errors: string[]; warnings: string[] }>>(
        `${this.base}/revisions/${revisionId}/validate`,
        {},
      )
      .pipe(map((body) => body.data ?? { errors: [], warnings: [] }));
  }

  publishDiff(revisionId: number): Observable<PlanCatalogPublishDiff> {
    return this.http
      .get<ApiEnvelope<PlanCatalogPublishDiff>>(`${this.base}/revisions/${revisionId}/publish-diff`)
      .pipe(map((body) => body.data!));
  }

  getFeatureVisibility(revisionId: number): Observable<PlanCatalogFeatureVisibilityEditor> {
    return this.http
      .get<ApiEnvelope<PlanCatalogFeatureVisibilityEditor>>(
        `${this.base}/revisions/${revisionId}/feature-visibility`,
      )
      .pipe(map((body) => body.data!));
  }

  saveFeatureVisibility(
    revisionId: number,
    payloadHash: string,
    hidden: Record<string, string[]>,
    hiddenPlans: string[],
  ): Observable<PlanCatalogFeatureVisibilityEditor> {
    return this.http
      .put<ApiEnvelope<PlanCatalogFeatureVisibilityEditor>>(
        `${this.base}/revisions/${revisionId}/feature-visibility`,
        { payload_hash: payloadHash, hidden, hidden_plans: hiddenPlans },
      )
      .pipe(map((body) => body.data!));
  }

  issuePreviewToken(revisionId: number): Observable<PlanCatalogPreviewToken> {
    return this.http
      .post<ApiEnvelope<PlanCatalogPreviewToken>>(`${this.base}/revisions/${revisionId}/preview-token`, {})
      .pipe(map((body) => body.data!));
  }

  publish(revisionId: number, payloadHash: string): Observable<unknown> {
    return this.http.post(`${this.base}/revisions/${revisionId}/publish`, {
      payload_hash: payloadHash,
      confirm: true,
    });
  }

  retryRevalidate(): Observable<{ status: string; error: string | null }> {
    return this.http
      .post<ApiEnvelope<{ status: string; error: string | null }>>(`${this.base}/retry-revalidate`, {})
      .pipe(map((body) => body.data ?? { status: 'failed', error: null }));
  }

  marketingSitePreviewUrl(previewPath: string): string {
    const base = environment.websiteUrl.replace(/\/$/, '');
    return `${base}${previewPath}`;
  }
}
