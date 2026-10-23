import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, finalize, take } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { ChurchCurrencyService } from '@core/services/church-currency.service';
import { DonationsService } from '@features/donations/services/donations.service';
import { ContributionPlan } from '@features/donations/models/donation.model';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';

export interface FamilyPlanAssignmentRow {
  plan_id: string;
  plan_name?: string;
  assigned_amount?: number | null;
  is_exempt?: boolean;
  frequency?: string;
}

@Component({
  selector: 'app-family-plan-amount-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ModalShellComponent,
    CfEmptyStateComponent,
  ],
  template: `
    <app-modal-shell
      *ngIf="open"
      title="Set plan amount"
      description="Set how much this family is expected to give on a family-specific plan. This does not record a payment or create a bill."
      size="sm"
      [loading]="plansLoading"
      loadingLabel="Loading plans"
      [isSubmitting]="saving"
      closeAriaLabel="Close set plan amount"
      (closeRequested)="requestClose()"
    >
      <div class="family-plan-amount-editor" *ngIf="!plansLoading">
        <p class="cf-meta family-plan-amount-editor__error" *ngIf="plansLoadError" role="alert">
          {{ plansLoadError }}
          <button type="button" class="cf-btn cf-btn--sm" (click)="loadPlans()">Try again</button>
        </p>

        <app-cf-empty-state
          *ngIf="!plansLoadError && !eligiblePlans.length"
          title="No family-specific plans"
          description="Create a contribution plan with per-family amounts on Contribution Plans, then return here to set this family's amount."
          icon="◇"
        >
          <a routerLink="/donations/plans" class="cf-btn">Manage Contribution Plans</a>
        </app-cf-empty-state>

        <form
          *ngIf="!plansLoadError && eligiblePlans.length"
          [formGroup]="form"
          class="family-plan-amount-editor__form"
          (ngSubmit)="submit()"
        >
          <div class="cf-field">
            <label for="family-plan-select">Contribution plan</label>
            <select id="family-plan-select" formControlName="plan_id" (change)="onPlanChange()">
              <option value="">Select a plan</option>
              <option *ngFor="let plan of eligiblePlans" [value]="plan.id">
                {{ planLabel(plan) }}
              </option>
            </select>
          </div>

          <p class="cf-meta family-plan-amount-editor__status" *ngIf="selectedPlan" role="status">
            <span>{{ amountFieldLabel(selectedPlan) }}</span>
            <span *ngIf="configuredAmountForSelected() === null"> · Not yet configured for this family</span>
            <span *ngIf="configuredAmountForSelected() !== null">
              · Current: {{ formatAmount(configuredAmountForSelected()) }}
            </span>
          </p>

          <div class="cf-field" *ngIf="form.value.plan_id">
            <label for="family-plan-amount">Amount</label>
            <div class="family-plan-amount-editor__amount">
              <span aria-hidden="true">{{ currencySymbol }}</span>
              <input
                id="family-plan-amount"
                type="number"
                formControlName="amount"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                [class.is-invalid]="amountInvalid"
              />
            </div>
            <span class="cf-field__error" *ngIf="amountInvalid" role="alert">Amount must be greater than zero.</span>
            <span class="cf-field__error" *ngIf="submitError" role="alert">{{ submitError }}</span>
          </div>
        </form>
      </div>

      <ng-container modalFooter>
        <button type="button" class="cf-btn cf-btn-ghost" (click)="requestClose()" [disabled]="saving">Cancel</button>
        <button
          type="button"
          class="cf-btn cf-btn-primary"
          (click)="submit()"
          [disabled]="saving || plansLoading || !eligiblePlans.length || form.invalid"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </ng-container>
    </app-modal-shell>
  `,
  styles: [`
    .family-plan-amount-editor__form { display: grid; gap: 0.85rem; }
    .family-plan-amount-editor__amount {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid var(--cf-slate-200);
      border-radius: var(--cf-radius-sm, 6px);
      padding: 0.35rem 0.5rem;
    }
    .family-plan-amount-editor__amount input {
      border: none;
      flex: 1;
      min-width: 0;
      font: inherit;
    }
    .family-plan-amount-editor__amount input:focus { outline: none; }
    .family-plan-amount-editor__amount.is-invalid,
    .family-plan-amount-editor__amount input.is-invalid { border-color: var(--cf-critical, #c00); }
    .family-plan-amount-editor__status { margin: 0; line-height: 1.45; }
    .family-plan-amount-editor__error { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0; }
  `],
})
export class FamilyPlanAmountEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly donationsService = inject(DonationsService);
  private readonly toast = inject(ToastService);
  private readonly churchCurrency = inject(ChurchCurrencyService);
  private readonly cdr = inject(ChangeDetectorRef);
  private plansLoadSubscription?: Subscription;

  @Input({ required: true }) familyId!: string;
  @Input() assignments: FamilyPlanAssignmentRow[] = [];
  @Input() open = false;
  @Input() preselectedPlanId: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  plans: ContributionPlan[] = [];
  plansLoading = false;
  plansLoadError: string | null = null;
  saving = false;
  submitError: string | null = null;
  submitAttempted = false;

  readonly form = this.fb.nonNullable.group({
    plan_id: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
  });

  /** Called by the parent when the user opens the editor (do not rely on ngOnChanges alone). */
  beginOpen(preselectedPlanId: string | null = null): void {
    this.preselectedPlanId = preselectedPlanId;
    this.resetFormState();
    this.loadPlans();
  }

  get eligiblePlans(): ContributionPlan[] {
    return this.plans
      .filter((plan) => plan.plan_type === 'individual' && plan.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  get selectedPlan(): ContributionPlan | undefined {
    const id = this.form.value.plan_id;
    return this.eligiblePlans.find((plan) => plan.id === id);
  }

  get currencySymbol(): string {
    return this.churchCurrency.currencySymbol() ?? '';
  }

  get amountInvalid(): boolean {
    const control = this.form.controls.amount;
    return this.submitAttempted && (control.invalid || control.value === '');
  }

  planLabel(plan: ContributionPlan): string {
    const code = plan.code?.trim();
    return code ? `${plan.name} · ${code}` : plan.name;
  }

  frequencyLabel(frequency?: string | null): string {
    const labels: Record<string, string> = {
      one_time: 'One time',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half-yearly',
      yearly: 'Yearly',
      weekly: 'Weekly',
      custom: 'Custom',
    };
    return labels[frequency || ''] || frequency || 'Plan';
  }

  amountFieldLabel(plan: ContributionPlan): string {
    const freq = this.frequencyLabel(plan.frequency);
    if (plan.frequency === 'one_time') {
      return `One-time amount for this family`;
    }
    return `${freq} amount for this family`;
  }

  configuredAmountForSelected(): number | null {
    const planId = this.form.value.plan_id;
    if (!planId) {
      return null;
    }
    const row = this.assignments.find((item) => item.plan_id === planId);
    if (!row || row.is_exempt) {
      return null;
    }
    if (row.assigned_amount === null || row.assigned_amount === undefined) {
      return null;
    }
    return row.assigned_amount;
  }

  formatAmount(value: number | null): string {
    if (value === null) {
      return '';
    }
    return this.churchCurrency.formatAmount(value);
  }

  onPlanChange(): void {
    this.submitError = null;
    const configured = this.configuredAmountForSelected();
    if (configured !== null) {
      this.form.patchValue({ amount: String(configured) });
    } else {
      this.form.patchValue({ amount: '' });
    }
  }

  loadPlans(): void {
    this.plansLoadSubscription?.unsubscribe();
    this.plansLoading = true;
    this.plansLoadError = null;
    this.cdr.markForCheck();

    this.plansLoadSubscription = this.donationsService.getPlans().pipe(
      take(1),
      finalize(() => {
        this.plansLoading = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: (response) => {
        const raw = response?.data;
        this.plans = Array.isArray(raw) ? raw : [];
        this.applyPreselection();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.plansLoadError = this.resolvePlansLoadError(err);
        this.cdr.markForCheck();
      },
    });
  }

  submit(): void {
    this.submitAttempted = true;
    this.submitError = null;
    if (this.form.invalid || !this.familyId) {
      this.form.markAllAsTouched();
      return;
    }

    const planId = this.form.controls.plan_id.value;
    const amount = Number(this.form.controls.amount.value);
    if (!Number.isFinite(amount) || amount < 0.01) {
      return;
    }

    this.saving = true;
    this.donationsService.saveFamilyPlanAssignment(this.familyId, {
      plan_id: planId,
      amount,
    }).subscribe({
      next: (response) => {
        this.saving = false;
        const savedAmount = response?.data?.amount ?? amount;
        this.toast.success(
          `Saved ${this.churchCurrency.formatAmount(savedAmount)} for this family.`,
          'Plan amount updated'
        );
        this.saved.emit();
        this.requestClose();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        const message = this.resolveErrorMessage(err);
        this.submitError = message;
        this.toast.error(message, 'Could not save plan amount');
      },
    });
  }

  requestClose(): void {
    if (this.saving) {
      return;
    }
    this.closed.emit();
  }

  private resetFormState(): void {
    this.submitAttempted = false;
    this.submitError = null;
    this.form.reset({ plan_id: '', amount: '' });
  }

  private applyPreselection(): void {
    const targetId = this.preselectedPlanId;
    if (!targetId || !this.eligiblePlans.some((plan) => plan.id === targetId)) {
      return;
    }
    this.form.patchValue({ plan_id: targetId });
    this.onPlanChange();
  }

  private resolvePlansLoadError(err: HttpErrorResponse): string {
    const code = err.error?.code;
    if (err.status === 403 && code === 'FEATURE_NOT_AVAILABLE') {
      return 'Contribution Plans are not included in your church subscription. Ask an administrator to enable them, or use Contribution Plans from Stewardship.';
    }
    return this.resolveErrorMessage(err) || 'Could not load contribution plans.';
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    const errors = err.error?.errors;
    if (errors && typeof errors === 'object') {
      const firstKey = Object.keys(errors)[0];
      const first = firstKey ? errors[firstKey] : null;
      if (Array.isArray(first) && first[0]) {
        return String(first[0]);
      }
    }
    if (err.error?.message) {
      return String(err.error.message);
    }
    return 'Something went wrong. Try again.';
  }
}
