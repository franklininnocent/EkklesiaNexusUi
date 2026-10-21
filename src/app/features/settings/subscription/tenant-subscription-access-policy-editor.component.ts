import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@core/errors/api-error';
import { FormsModule } from '@angular/forms';
import { TenantService } from '@core/services/tenant.service';
import { ToastService } from '@core/services/toast.service';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { Subject, takeUntil } from 'rxjs';

export interface TenantAccessPolicyPayload {
  tenant_id: number;
  tenant_name: string;
  stored_status: string;
  effective_status: string;
  access_mode: string;
  subscription_ends_at?: string | null;
  grace_ends_at?: string | null;
  view_only_ends_at?: string | null;
  grandfather_until?: string | null;
  grace_period_days: number;
  view_only_allowance_days: number;
  grace_period_inherited: boolean;
  view_only_allowance_inherited: boolean;
  custom_grace_period_days: number | null;
  custom_view_only_allowance_days: number | null;
  renewal_available?: boolean;
}

@Component({
  selector: 'app-tenant-subscription-access-policy-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent, StatusBadgeComponent, CfDatePipe],
  template: `
    <div *ngIf="loading" class="cf-loading-block" role="status" aria-busy="true">
      <app-loading-skeleton label="Loading access policy…" type="card" [rows]="4"></app-loading-skeleton>
    </div>

    <div *ngIf="error && !loading" class="cf-inline-alert" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="cf-btn cf-btn-primary" (click)="load()">Try again</button>
    </div>

    <article *ngIf="policy && !loading" class="policy-editor">
      <header>
        <h3>{{ policy.tenant_name }}</h3>
        <p class="policy-editor__meta">
          Stored: <app-status-badge [label]="policy.stored_status" tone="neutral"></app-status-badge>
          Effective: <app-status-badge [label]="policy.effective_status" tone="warning"></app-status-badge>
          Access: <strong>{{ policy.access_mode }}</strong>
        </p>
      </header>

      <dl class="policy-editor__dates">
        <div><dt>Subscription ends</dt><dd>{{ policy.subscription_ends_at | cfDate }}</dd></div>
        <div><dt>Grace ends</dt><dd>{{ policy.grace_ends_at | cfDate }}</dd></div>
        <div><dt>View-only ends</dt><dd>{{ policy.view_only_ends_at | cfDate }}</dd></div>
        <div *ngIf="policy.grandfather_until"><dt>Grandfather until</dt><dd>{{ policy.grandfather_until | cfDate }}</dd></div>
      </dl>

      <div class="policy-editor__grid">
        <div class="policy-editor__field">
          <label for="custom-grace-{{ tenantId }}">Custom grace (days)</label>
          <input
            id="custom-grace-{{ tenantId }}"
            type="number"
            min="0"
            max="365"
            [(ngModel)]="form.custom_grace_period_days"
            [disabled]="saving"
          />
          <small>{{ policy.grace_period_inherited ? 'Inherited from global' : 'Override active' }}</small>
        </div>
        <div class="policy-editor__field">
          <label for="custom-vo-{{ tenantId }}">Custom view-only allowance (days)</label>
          <input
            id="custom-vo-{{ tenantId }}"
            type="number"
            min="0"
            max="365"
            [(ngModel)]="form.custom_view_only_allowance_days"
            [disabled]="saving"
          />
          <small>{{ policy.view_only_allowance_inherited ? 'Inherited from global' : 'Override active' }}</small>
        </div>
      </div>

      <div class="policy-editor__actions">
        <button type="button" class="cf-btn cf-btn-primary" [disabled]="saving" (click)="save()">
          {{ saving ? 'Saving…' : 'Save overrides' }}
        </button>
        <button type="button" class="cf-btn" [disabled]="saving" (click)="resetToInherit()">Reset to inherit global</button>
      </div>
    </article>
  `,
  styles: [
    `
      .policy-editor__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        align-items: center;
      }
      .policy-editor__dates {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
        gap: 0.75rem;
        margin: 1rem 0;
      }
      .policy-editor__dates dt {
        font-size: 0.75rem;
        color: var(--cf-color-text-muted, #666);
      }
      .policy-editor__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        gap: 1rem;
      }
      .policy-editor__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantSubscriptionAccessPolicyEditorComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) tenantId!: number;

  private readonly tenantService = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  loading = false;
  saving = false;
  error: string | null = null;
  policy: TenantAccessPolicyPayload | null = null;

  form = {
    custom_grace_period_days: null as number | null,
    custom_view_only_allowance_days: null as number | null,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tenantId'] && this.tenantId) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.tenantId) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.tenantService
      .getTenantSubscriptionAccessPolicy(this.tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.policy = res.data as unknown as TenantAccessPolicyPayload;
            this.form = {
              custom_grace_period_days: this.policy.custom_grace_period_days,
              custom_view_only_allowance_days: this.policy.custom_view_only_allowance_days,
            };
          } else {
            this.error = 'Unable to load access policy.';
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = apiErrorMessage(err, 'Unable to load access policy.');
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  save(): void {
    if (!this.tenantId) {
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();

    this.tenantService
      .updateTenantSubscriptionAccessPolicy(this.tenantId, this.form)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.policy = res.data as unknown as TenantAccessPolicyPayload;
            this.toast.success('Access policy saved', 'Saved');
          } else {
            this.toast.error('Unable to save access policy', 'Error');
          }
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toast.error(apiErrorMessage(err, 'Unable to save access policy'), 'Error');
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
  }

  resetToInherit(): void {
    this.form = { custom_grace_period_days: null, custom_view_only_allowance_days: null };
    this.save();
  }
}
