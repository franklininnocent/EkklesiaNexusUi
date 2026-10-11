import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ApiEnvelope,
  MarketingContentDraft,
  MarketingContentRevisionRow,
  PublishMarketingResult,
  PublishedMarketingContent,
} from '../models/marketing-admin.models';

@Injectable({ providedIn: 'root' })
export class MarketingAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/marketing`;

  listRevisions(): Observable<MarketingContentRevisionRow[]> {
    return this.http
      .get<ApiEnvelope<MarketingContentRevisionRow[]>>(`${this.base}/content/revisions`)
      .pipe(map((body) => (body.success && body.data ? body.data : [])));
  }

  getPublished(): Observable<PublishedMarketingContent | null> {
    return this.http.get<ApiEnvelope<PublishedMarketingContent>>(`${this.base}/content/published`).pipe(
      map((body) => (body.success && body.data ? body.data : null)),
    );
  }

  getLatestDraft(): Observable<MarketingContentDraft | null> {
    return this.http
      .get<ApiEnvelope<MarketingContentDraft>>(`${this.base}/content/drafts/latest`)
      .pipe(
        map((body) => (body.success && body.data ? body.data : null)),
        catchError((err: { status?: number }) =>
          err.status === 404 ? of(null) : throwError(() => err),
        ),
      );
  }

  saveDraft(payload: Record<string, unknown>, notes?: string): Observable<{ revision_id: number }> {
    return this.http
      .post<ApiEnvelope<{ revision_id: number }>>(`${this.base}/content/drafts`, {
        payload,
        notes: notes?.trim() || undefined,
      })
      .pipe(
        map((body) => {
          if (!body.success || !body.data) {
            throw new Error(body.message ?? 'Draft save failed.');
          }
          return body.data;
        }),
      );
  }

  publishDraftRevision(revisionId: number): Observable<PublishMarketingResult> {
    return this.http
      .post<ApiEnvelope<PublishMarketingResult>>(`${this.base}/content/revisions/${revisionId}/publish`, {})
      .pipe(
        map((body) => {
          if (!body.success || !body.data) {
            throw new Error(body.message ?? 'Publish failed.');
          }
          return body.data;
        }),
      );
  }

  publish(payload: Record<string, unknown>, notes?: string): Observable<PublishMarketingResult> {
    return this.http
      .post<ApiEnvelope<PublishMarketingResult>>(`${this.base}/content/publish`, {
        payload,
        notes: notes?.trim() || undefined,
      })
      .pipe(
        map((body) => {
          if (!body.success || !body.data) {
            throw new Error(body.message ?? 'Publish failed.');
          }
          return body.data;
        }),
      );
  }
}
