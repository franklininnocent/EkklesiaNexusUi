import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TenantBillingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tenant/billing`;

  availability(): Observable<{ success: boolean; data: Record<string, unknown> }> {
    return this.http.get<{ success: boolean; data: Record<string, unknown> }>(`${this.base}/availability`);
  }

  quote(planCode: string, billingInterval: 'MONTHLY' | 'ANNUAL'): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/quotes`, {
      plan_code: planCode,
      billing_interval: billingInterval,
    });
  }

  createOrder(
    planCode: string,
    billingInterval: 'MONTHLY' | 'ANNUAL',
    idempotencyKey: string,
  ): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(
      `${this.base}/orders`,
      { plan_code: planCode, billing_interval: billingInterval },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  verifyOrder(
    orderId: number,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/orders/${orderId}/verify`, {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });
  }

  invoices(): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.base}/invoices`);
  }

  offlineInstructions(): Observable<{ success: boolean; data: { allowed: boolean; methods: { code: string; label: string; instructions: { body?: string } | null }[] } }> {
    return this.http.get<{ success: boolean; data: { allowed: boolean; methods: { code: string; label: string; instructions: { body?: string } | null }[] } }>(
      `${this.base}/offline-instructions`,
    );
  }

  createPayableOrder(
    planCode: string,
    billingInterval: 'MONTHLY' | 'ANNUAL',
    idempotencyKey: string,
  ): Observable<{ success: boolean; data: { order: { id: number }; invoice_id: number } }> {
    return this.http.post<{ success: boolean; data: { order: { id: number }; invoice_id: number } }>(
      `${this.base}/payable-orders`,
      { plan_code: planCode, billing_interval: billingInterval },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  downloadInvoice(invoiceId: number, format: 'html' | 'pdf' = 'pdf'): Observable<Blob> {
    const q = format === 'pdf' ? '?format=pdf' : '';
    return this.http.get(`${this.base}/invoices/${invoiceId}/download${q}`, { responseType: 'blob' });
  }

  creditNotes(): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.base}/credit-notes`);
  }

  downloadCreditNote(creditNoteId: number): Observable<Blob> {
    return this.http.get(`${this.base}/credit-notes/${creditNoteId}/download`, { responseType: 'blob' });
  }

  uploadOfflineClaimEvidence(claimId: number, file: File): Observable<{ success: boolean; data: unknown }> {
    const form = new FormData();
    form.append('evidence', file);
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/offline-claims/${claimId}/evidence`, form);
  }

  submitOfflineClaim(body: {
    billing_invoice_id: number;
    method_code: string;
    claimed_amount: string;
    currency_code: string;
    reference_number?: string;
    claimed_payment_date?: string;
    notes?: string;
  }): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(`${this.base}/offline-claims`, body);
  }
}
