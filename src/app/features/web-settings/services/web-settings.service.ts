import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ApiEnvelope,
  ContactEnquiryListQuery,
  ContactEnquiryRow,
  WebSettingsPayload,
} from '../models/web-settings.models';

@Injectable({ providedIn: 'root' })
export class WebSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly settingsUrl = `${environment.apiUrl}/admin/web-settings`;
  private readonly enquiriesUrl = `${environment.apiUrl}/admin/contact-enquiries`;

  getSettings(): Observable<WebSettingsPayload> {
    return this.http.get<ApiEnvelope<WebSettingsPayload>>(this.settingsUrl).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Unable to load web settings.');
        }
        return body.data;
      }),
    );
  }

  saveSettings(payload: Omit<WebSettingsPayload, 'diagnostics' | 'updated_at' | 'updated_at_label'>): Observable<WebSettingsPayload> {
    return this.http.put<ApiEnvelope<WebSettingsPayload>>(this.settingsUrl, payload).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Unable to save web settings.');
        }
        return body.data;
      }),
    );
  }

  sendTestEmail(): Observable<string> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.settingsUrl}/test-email`, {}).pipe(
      map((body) => {
        if (!body.success) {
          throw new Error(body.message ?? 'Test email failed.');
        }
        return body.message ?? 'Test email handed to the mail transport.';
      }),
    );
  }

  listEnquiries(query: ContactEnquiryListQuery): Observable<{ rows: ContactEnquiryRow[]; meta: NonNullable<ApiEnvelope<unknown>['meta']> }> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiEnvelope<ContactEnquiryRow[]>>(this.enquiriesUrl, { params }).pipe(
      map((body) => ({
        rows: body.success && body.data ? body.data : [],
        meta: body.meta ?? { current_page: 1, per_page: 20, total: 0, last_page: 1 },
      })),
    );
  }

  getEnquiry(id: string): Observable<ContactEnquiryRow> {
    return this.http.get<ApiEnvelope<ContactEnquiryRow>>(`${this.enquiriesUrl}/${id}`).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Unable to load enquiry.');
        }
        return body.data;
      }),
    );
  }

  updateEnquiry(id: string, payload: { enquiry_status?: string; is_read?: boolean }): Observable<ContactEnquiryRow> {
    return this.http.patch<ApiEnvelope<ContactEnquiryRow>>(`${this.enquiriesUrl}/${id}`, payload).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Unable to update enquiry.');
        }
        return body.data;
      }),
    );
  }

  retryEmail(id: string): Observable<ContactEnquiryRow> {
    return this.http.post<ApiEnvelope<ContactEnquiryRow>>(`${this.enquiriesUrl}/${id}/retry-email`, {}).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Unable to retry email.');
        }
        return body.data;
      }),
    );
  }

  deleteEnquiry(id: string): Observable<void> {
    return this.http.delete<ApiEnvelope<unknown>>(`${this.enquiriesUrl}/${id}`).pipe(
      map((body) => {
        if (!body.success) {
          throw new Error(body.message ?? 'Unable to delete enquiry.');
        }
      }),
    );
  }

  bulkDeleteEnquiries(ids: string[]): Observable<{ deleted_count: number }> {
    return this.http.post<ApiEnvelope<{ deleted_count: number }>>(`${this.enquiriesUrl}/bulk-delete`, { ids }).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Unable to delete enquiries.');
        }
        return body.data;
      }),
    );
  }
}
