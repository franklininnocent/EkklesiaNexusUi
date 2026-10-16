import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tenant } from '@core/models/tenant.model';
import { TenantService } from '@core/services/tenant.service';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';

export interface BillingTenantSelection {
  id: number;
  name: string;
}

@Component({
  selector: 'app-billing-tenant-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-tenant-picker">
      <label class="billing-tenant-picker__label">
        Church <span class="cf-required" *ngIf="required">*</span>
        <input
          type="search"
          [(ngModel)]="term"
          (ngModelChange)="onTermChange($event)"
          [disabled]="disabled"
          placeholder="Type at least 2 characters to search"
          autocomplete="off" />
      </label>
      @if (loading) {
        <p class="cf-muted" role="status">Searching churches…</p>
      }
      <ul class="billing-tenant-picker__list" *ngIf="options.length && !selected">
        <li *ngFor="let t of options">
          <button type="button" class="billing-tenant-picker__option" (click)="select(t)">
            <span class="billing-tenant-picker__name">{{ t.name }}</span>
            <span class="billing-tenant-picker__meta">#{{ t.id }}</span>
          </button>
        </li>
      </ul>
      <div class="billing-tenant-picker__selected cf-panel" *ngIf="selected">
        <span><strong>{{ selected.name }}</strong> (#{{ selected.id }})</span>
        <button type="button" class="cf-btn cf-btn-sm" (click)="clear()" [disabled]="disabled">Change</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .billing-tenant-picker {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        grid-column: 1 / -1;
      }
      .billing-tenant-picker__label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .billing-tenant-picker__label input {
        width: 100%;
      }
      .billing-tenant-picker__list {
        list-style: none;
        margin: 0;
        padding: 0;
        border: 1px solid var(--cf-border, #e2e8f0);
        border-radius: var(--cf-radius-md, 0.375rem);
        max-height: 10rem;
        overflow-y: auto;
      }
      .billing-tenant-picker__option {
        display: flex;
        justify-content: space-between;
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        font: inherit;
      }
      .billing-tenant-picker__option:hover,
      .billing-tenant-picker__option:focus-visible {
        background: var(--cf-surface-muted, #f1f5f9);
      }
      .billing-tenant-picker__meta {
        color: var(--cf-text-muted, #64748b);
        font-size: 0.8125rem;
      }
      .billing-tenant-picker__selected {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class BillingTenantPickerComponent implements OnInit, OnDestroy {
  private readonly tenants = inject(TenantService);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  @Input() required = true;
  @Input() disabled = false;
  @Input() tenantId: number | null = null;

  @Output() tenantChange = new EventEmitter<BillingTenantSelection | null>();

  term = '';
  options: Tenant[] = [];
  loading = false;
  selected: BillingTenantSelection | null = null;

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          if (q.length < 2) {
            return of({ success: true, data: [] as Tenant[] });
          }
          this.loading = true;
          return this.tenants.listTenants({ search: q, per_page: 15, page: 1 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.options = res?.success && res.data ? res.data : [];
          this.loading = false;
        },
        error: () => {
          this.options = [];
          this.loading = false;
        },
      });

    if (this.tenantId) {
      this.tenants.getTenant(this.tenantId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.select({ id: res.data.id, name: res.data.name });
          }
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTermChange(value: string): void {
    this.search$.next(value);
  }

  select(tenant: Tenant | BillingTenantSelection): void {
    this.selected = { id: tenant.id, name: tenant.name };
    this.tenantId = tenant.id;
    this.term = '';
    this.options = [];
    this.tenantChange.emit(this.selected);
  }

  clear(): void {
    this.selected = null;
    this.tenantId = null;
    this.tenantChange.emit(null);
  }
}
