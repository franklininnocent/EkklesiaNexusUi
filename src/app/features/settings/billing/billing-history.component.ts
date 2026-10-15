import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { cfFormatDate } from '@shared/utils/cf-intl.util';
import { TenantBillingService } from './tenant-billing.service';

interface InvoiceRow {
  id: number;
  invoice_number: string;
  status: string;
  gross_amount: string;
  amount_paid: string;
  currency_code: string;
  issued_at?: string;
}

interface CreditNoteRow {
  id: number;
  credit_note_number: string;
  amount: string;
  currency_code: string;
  issued_at?: string;
}

@Component({
  selector: 'app-billing-history',
  standalone: true,
  imports: [CommonModule, CfCurrencyPipe],
  template: `
    <section class="my-sub-panel" aria-labelledby="billing-history-title">
      <header class="my-sub-panel__header">
        <div>
          <h2 id="billing-history-title">Billing history</h2>
          <p>Invoices for this church</p>
        </div>
      </header>
      <p *ngIf="loading" role="status">Loading invoices…</p>
      <p *ngIf="error" class="my-sub-request-form__error" role="alert">{{ error }}</p>
      <div class="billing-history__table-wrap" *ngIf="!loading && rows.length">
      <table class="cf-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Issued</th>
            <th>Status</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows">
            <td>{{ row.invoice_number }}</td>
            <td>{{ formatDate(row.issued_at) }}</td>
            <td>{{ row.status }}</td>
            <td>{{ row.gross_amount | cfCurrency: row.currency_code }}</td>
            <td>
              <button type="button" class="cf-btn cf-btn-sm" (click)="download(row)">PDF</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <p *ngIf="!loading && !rows.length" class="my-sub-muted">No invoices yet.</p>

      <h3 class="billing-history__subtitle" *ngIf="creditNotes.length">Credit notes</h3>
      <div class="billing-history__table-wrap" *ngIf="creditNotes.length">
      <table class="cf-table">
        <thead>
          <tr>
            <th>Credit note</th>
            <th>Issued</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let note of creditNotes">
            <td>{{ note.credit_note_number }}</td>
            <td>{{ formatDate(note.issued_at) }}</td>
            <td>{{ note.amount | cfCurrency: note.currency_code }}</td>
            <td>
              <button type="button" class="cf-btn cf-btn-sm" (click)="downloadCreditNote(note)">PDF</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>
  `,
  styles: [
    `
      .billing-history__table-wrap {
        width: 100%;
        overflow-x: auto;
        margin-bottom: 1rem;
      }
      .billing-history__table-wrap .cf-table {
        min-width: 32rem;
        width: 100%;
      }
      .billing-history__subtitle {
        margin: 1.25rem 0 0.5rem;
        font-size: 1rem;
        font-weight: 600;
      }
    `,
  ],
})
export class BillingHistoryComponent implements OnInit {
  private readonly billing = inject(TenantBillingService);

  loading = true;
  error: string | null = null;
  rows: InvoiceRow[] = [];
  creditNotes: CreditNoteRow[] = [];

  ngOnInit(): void {
    this.billing.invoices().subscribe({
      next: (res) => {
        const page = res.data as { data?: InvoiceRow[] };
        this.rows = page?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load billing history.';
        this.loading = false;
      },
    });
    this.billing.creditNotes().subscribe({
      next: (res) => {
        const page = res.data as { data?: CreditNoteRow[] };
        this.creditNotes = page?.data ?? [];
      },
    });
  }

  formatDate(value?: string): string {
    return value ? cfFormatDate(value) || value : '—';
  }

  downloadCreditNote(note: CreditNoteRow): void {
    this.billing.downloadCreditNote(note.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.error = 'Could not open credit note.';
      },
    });
  }

  download(row: InvoiceRow): void {
    this.billing.downloadInvoice(row.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.error = 'Could not open invoice.';
      },
    });
  }
}
