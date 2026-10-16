import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BillingControlsPayload {
  customer_payment_actions?: 'enabled' | 'disabled';
  online_checkout?: 'enabled' | 'disabled' | 'maintenance';
  offline_claims?: 'enabled' | 'disabled';
  maintenance_message?: string | null;
  maintenance_until?: string | null;
  maintenance_revert_to?: 'enabled' | 'disabled';
  reason: string;
}

export interface BillingPromotionRow {
  id: number;
  code: string;
  name: string;
  status: string;
  discount_type: string;
  discount_value?: string;
}

export interface Paginated<T> {
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class BillingAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/subscriptions/billing`;

  getControls(): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.base}/controls`);
  }

  updateControls(payload: BillingControlsPayload): Observable<{ success: boolean; data: unknown }> {
    return this.http.put<{ success: boolean; data: unknown }>(`${this.base}/controls`, payload);
  }

  updateGateway(
    environment: 'test' | 'live',
    payload: Record<string, unknown>,
  ): Observable<{ success: boolean; data: unknown }> {
    return this.http.put<{ success: boolean; data: unknown }>(`${this.base}/gateways/${environment}`, payload);
  }

  validateGateway(environment: 'test' | 'live'): Observable<{ success: boolean; data: { ok: boolean } }> {
    return this.http.post<{ success: boolean; data: { ok: boolean } }>(
      `${this.base}/gateways/${environment}/validate`,
      {},
    );
  }

  listPromotions(): Observable<{ success: boolean; data: Paginated<BillingPromotionRow> }> {
    return this.http.get<{ success: boolean; data: Paginated<BillingPromotionRow> }>(`${this.base}/promotions`);
  }

  createPromotion(payload: Record<string, unknown>): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/promotions`, payload);
  }

  getPromotion(id: number): Observable<{ success: boolean; data: { promotion: BillingPromotionRow; plan_eligibility: unknown[] } }> {
    return this.http.get<{ success: boolean; data: { promotion: BillingPromotionRow; plan_eligibility: unknown[] } }>(
      `${this.base}/promotions/${id}`,
    );
  }

  updatePromotion(id: number, payload: Record<string, unknown>): Observable<{ success: boolean; data: unknown }> {
    return this.http.patch<{ success: boolean; data: unknown }>(`${this.base}/promotions/${id}`, payload);
  }

  setPromotionStatus(id: number, status: string, reason: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/promotions/${id}/status`, {
      status,
      reason,
    });
  }

  listOfflineClaims(status?: string): Observable<{ success: boolean; data: Paginated<Record<string, unknown>> }> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<{ success: boolean; data: Paginated<Record<string, unknown>> }>(`${this.base}/offline-claims${q}`);
  }

  approveOfflineClaim(
    id: number,
    reason?: string,
    secondApproverUserId?: number,
  ): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/offline-claims/${id}/approve`, {
      reason: reason ?? null,
      second_approver_user_id: secondApproverUserId ?? null,
    });
  }

  rejectOfflineClaim(id: number, reason: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/offline-claims/${id}/reject`, { reason });
  }

  listOrders(params?: { reference?: string; tenant_id?: number }): Observable<{ success: boolean; data: Paginated<Record<string, unknown>> }> {
    const search = new URLSearchParams();
    if (params?.reference) {
      search.set('reference', params.reference);
    }
    if (params?.tenant_id) {
      search.set('tenant_id', String(params.tenant_id));
    }
    const q = search.toString() ? `?${search}` : '';
    return this.http.get<{ success: boolean; data: Paginated<Record<string, unknown>> }>(`${this.base}/orders${q}`);
  }

  getOrder(id: number): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.base}/orders/${id}`);
  }

  assignTenantPrice(payload: Record<string, unknown>): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/tenant-price-assignments`, payload);
  }

  listTenantPriceAssignments(tenantId?: number): Observable<{ success: boolean; data: Paginated<Record<string, unknown>> }> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return this.http.get<{ success: boolean; data: Paginated<Record<string, unknown>> }>(
      `${this.base}/tenant-price-assignments${q}`,
    );
  }

  runReconciliation(): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/reconciliation/runs`, {});
  }

  webhookHealth(): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.base}/webhooks/health`);
  }

  operationsSummary(): Observable<{ success: boolean; data: Record<string, unknown> }> {
    return this.http.get<{ success: boolean; data: Record<string, unknown> }>(`${this.base}/operations/summary`);
  }

  listOfflineMethods(): Observable<{ success: boolean; data: unknown[] }> {
    return this.http.get<{ success: boolean; data: unknown[] }>(`${this.base}/offline-methods`);
  }

  updateOfflineMethod(id: number, payload: Record<string, unknown>): Observable<{ success: boolean; data: unknown }> {
    return this.http.patch<{ success: boolean; data: unknown }>(`${this.base}/offline-methods/${id}`, payload);
  }

  getOfflineClaim(id: number): Observable<{ success: boolean; data: { evidence_display_url?: string } }> {
    return this.http.get<{ success: boolean; data: { evidence_display_url?: string } }>(`${this.base}/offline-claims/${id}`);
  }

  listAuditEvents(): Observable<{ success: boolean; data: Paginated<Record<string, unknown>> }> {
    return this.http.get<{ success: boolean; data: Paginated<Record<string, unknown>> }>(`${this.base}/audit-events`);
  }

  requestRefund(body: {
    billing_payment_attempt_id: number;
    amount: string;
    reason: string;
  }): Observable<{ success: boolean; data: { id?: number } }> {
    return this.http.post<{ success: boolean; data: { id?: number } }>(`${this.base}/refunds`, body);
  }

  approveRefund(refundId: number, reason: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/refunds/${refundId}/approve`, { reason });
  }

  listInvestigations(status?: string): Observable<{ success: boolean; data: Paginated<Record<string, unknown>> }> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<{ success: boolean; data: Paginated<Record<string, unknown>> }>(`${this.base}/investigations${q}`);
  }

  resolveInvestigation(id: number, note: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/investigations/${id}/resolve`, { note });
  }

  listTenantAgreements(tenantId?: number): Observable<{ success: boolean; data: Paginated<Record<string, unknown>> }> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return this.http.get<{ success: boolean; data: Paginated<Record<string, unknown>> }>(`${this.base}/tenant-agreements${q}`);
  }

  createTenantAgreement(payload: Record<string, unknown>): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/tenant-agreements`, payload);
  }

  revokeTenantAgreement(id: number, reason: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/tenant-agreements/${id}/revoke`, { reason });
  }
}
