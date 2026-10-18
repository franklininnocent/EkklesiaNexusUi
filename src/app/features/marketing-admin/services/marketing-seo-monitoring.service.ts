import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiEnvelope } from '../models/marketing-admin.models';
import {
  SeoMonitoringScanResult,
  SeoMonitoringSnapshot,
} from '../models/marketing-seo-monitoring.models';

@Injectable({ providedIn: 'root' })
export class MarketingSeoMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/marketing/seo-monitoring`;

  getSnapshot(): Observable<SeoMonitoringSnapshot> {
    return this.http.get<ApiEnvelope<SeoMonitoringSnapshot>>(`${this.base}/snapshot`).pipe(
      map((body) => {
        if (!body.success || !body.data) {
          throw new Error(body.message ?? 'Could not load SEO monitoring snapshot.');
        }
        return body.data;
      }),
    );
  }

  runScan(includeProduction: boolean): Observable<SeoMonitoringScanResult> {
    return this.http
      .post<ApiEnvelope<SeoMonitoringScanResult>>(`${this.base}/scans`, {
        include_production: includeProduction,
      })
      .pipe(
        map((body) => {
          if (!body.success || !body.data) {
            throw new Error(body.message ?? 'Scan failed.');
          }
          return body.data;
        }),
      );
  }
}
