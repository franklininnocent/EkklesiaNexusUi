import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  ExecutiveDashboardBundle,
  ExecutiveDashboardPayload,
} from '../models/executive-dashboard.model';

@Injectable({ providedIn: 'root' })
export class ExecutiveDashboardService {
  private readonly http = inject(HttpClient);

  getExecutive(bundle: ExecutiveDashboardBundle = 'all'): Observable<ExecutiveDashboardPayload> {
    const params = bundle === 'all' ? undefined : new HttpParams().set('bundle', bundle);

    return this.http
      .get<{ success: boolean; data: ExecutiveDashboardPayload }>(
        `${environment.apiUrl}/tenant/dashboard/executive`,
        params ? { params } : {}
      )
      .pipe(map((res) => res.data));
  }
}
