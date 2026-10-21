import { CfDateFieldComponent } from '@shared/components/cf-date-field/cf-date-field.component';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy, ViewChild, inject } from '@angular/core';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription, switchMap } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { ChurchCurrencyService } from '@core/services/church-currency.service';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { CfFamilyPickerLabelPipe } from '@shared/pipes/cf-family-picker-label.pipe';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { ToastService } from '@core/services/toast.service';
import { FamilyService } from '@core/services/family.service';
import { Family } from '@core/models/family.model';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CfActionIconComponent } from '@shared/components/cf-action-icon/cf-action-icon.component';
import { EditIconButtonComponent } from '@shared/components/edit-icon-button/edit-icon-button.component';
import { CfSelectCreateFooterComponent } from '@shared/components/cf-select-create-footer/cf-select-create-footer.component';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { DonationsService } from '../services/donations.service';
import { ContributionDue, ContributionPlan, ContributionPlanAssignment } from '../models/donation.model';
import { localDateOnly } from '../utils/local-date-only';
import { toDateInputValue } from '../utils/to-date-input-value';

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

@Component({
  selector: 'app-donations-plans',
  standalone: true,
  imports: [CfDateFieldComponent, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgSelectModule,
    CfEmptyStateComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    CfCurrencyPipe,
    CfActionIconComponent,
    EditIconButtonComponent,
    CfFamilyPickerLabelPipe,
    CfSelectCreateFooterComponent,
    ModalShellComponent,
  ],
  templateUrl: './donations-plans.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './donations-plans.component.scss'
})
export class DonationsPlansComponent implements OnInit, OnDestroy {
  @ViewChild('fundSelect') fundSelect?: NgSelectComponent;
  @ViewChild('purposeNameInput') purposeNameInput?: ElementRef<HTMLInputElement>;

  plans: ContributionPlan[] = [];
  plansLoaded = false;
  plansLoadError: string | null = null;
  private loadPlansSeq = 0;
  private routerSub?: Subscription;
  private skipNextNavReload = true;
  tableSearch = '';
  funds: Array<{ id: string; name: string; code: string }> = [];
  fundsLoaded = false;
  fundsLoadError: string | null = null;
  creatingPurpose = false;
  showPurposeModal = false;
  purposeModalName = '';
  purposeModalError: string | null = null;
  purposeModalAttempted = false;
  /** Re-evaluated when the collection-purpose panel opens. */
  canCreatePurpose = false;
  purposeSearchTerm = '';
  private readonly document = inject(DOCUMENT);
  private purposeFooterDocListener: ((event: MouseEvent) => void) | null = null;
  private lastSelectedFundId: string | null = null;
  private createPurposeSub?: Subscription;
  families: Family[] = [];
  draftAssignments: ContributionPlanAssignment[] = [];
  selectedFamilyId = '';
  assignmentAmount = 0;
  assignmentEffectiveFrom = localDateOnly();
  showForm = false;
  editingPlanId: string | null = null;
  saving = false;
  submitAttempted = false;
  formError: string | null = null;
  highlightPlanId: string | null = null;
  canManage = false;
  generatingPlanId: string | null = null;

  planForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    code: [''],
    fund_id: [null as string | null, Validators.required],
    plan_type: ['uniform', Validators.required],
    frequency: ['monthly', Validators.required],
    custom_interval_days: [30, [Validators.min(1)]],
    default_amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    start_date: ['', Validators.required],
    end_date: [''],
    auto_generate: [true],
    status: ['active']
  }, { validators: [this.endDateAfterStartValidator] });

  constructor(
    private fb: FormBuilder,
    private donationsService: DonationsService,
    private familyService: FamilyService,
    private authService: AuthService,
    private confirmationDialog: ConfirmationDialogService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private churchCurrency: ChurchCurrencyService,
  ) {}

  get currencySymbol(): string {
    return this.churchCurrency.currencySymbol() ?? '';
  }

  ngOnInit(): void {
    this.canManage = this.authService.hasPermission('donations.manage');
    this.loadPlans();
    this.loadFunds();
    this.loadFamilies();
    this.routerSub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      if (!e.urlAfterRedirects.includes('/donations/plans')) {
        return;
      }
      if (this.skipNextNavReload) {
        this.skipNextNavReload = false;
        return;
      }
      this.loadPlans();
    });
  }

  ngOnDestroy(): void {
    this.detachPurposeFooterDocumentListener();
    this.routerSub?.unsubscribe();
    this.createPurposeSub?.unsubscribe();
  }

  get activePlanCount(): number {
    return this.plans.filter((plan) => plan.status === 'active').length;
  }

  get sameAmountForAll(): boolean {
    return this.planForm.value.plan_type === 'uniform';
  }

  get formValidationSummary(): string {
    if (this.planForm.value.plan_type === 'individual' && !this.draftAssignments.length) {
      return 'Add at least one family amount before saving.';
    }
    if (!this.funds.length) {
      return 'Add a collection purpose before saving.';
    }
    return 'Complete the highlighted fields below.';
  }

  get filteredPlans(): ContributionPlan[] {
    const query = this.tableSearch.trim().toLowerCase();
    if (!query) {
      return this.plans;
    }
    return this.plans.filter((plan) =>
      [plan.name, plan.code, plan.frequency, plan.status].join(' ').toLowerCase().includes(query)
    );
  }

  frequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      one_time: 'One time',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half-yearly',
      yearly: 'Yearly',
      weekly: 'Weekly',
      custom: 'Custom'
    };
    return labels[frequency] || frequency;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.planForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitAttempted));
  }

  fieldError(field: string): string {
    const control = this.planForm.get(field);
    if (!control?.errors) {
      return '';
    }
    if (control.errors['required']) {
      const labels: Record<string, string> = {
        name: 'Plan name is required.',
        fund_id: 'Please select a collection purpose.',
        default_amount: 'Amount per family is required.',
        start_date: 'Start date is required.',
        custom_interval_days: 'Enter the interval in days.'
      };
      return labels[field] || 'This field is required.';
    }
    if (control.errors['min']) {
      return field === 'default_amount' ? 'Amount must be greater than zero.' : 'Enter a valid value.';
    }
    if (control.errors['dateRange']) {
      return 'End date cannot be before the start date.';
    }
    if (control.errors['duplicateName']) {
      return 'A plan with this name already exists.';
    }
    return 'Check this field.';
  }

  endDateAfterStartValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('start_date')?.value;
    const end = group.get('end_date')?.value;
    const endControl = group.get('end_date');
    if (start && end && end < start) {
      endControl?.setErrors({ ...(endControl.errors || {}), dateRange: true });
      return { dateRange: true };
    }
    if (endControl?.errors?.['dateRange']) {
      const { dateRange, ...rest } = endControl.errors;
      endControl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  }

  onSameAmountToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.planForm.patchValue({ plan_type: checked ? 'uniform' : 'individual' });
  }

  onFrequencyChange(): void {
    if (this.planForm.value.frequency !== 'one_time') {
      return;
    }
    const start = this.planForm.value.start_date;
    if (start && !this.planForm.value.end_date) {
      this.planForm.patchValue({ end_date: start });
    }
  }

  onStartDateChange(): void {
    const start = this.planForm.value.start_date;
    if (start) {
      this.assignmentEffectiveFrom = start;
    }
    if (this.planForm.value.frequency !== 'one_time') {
      return;
    }
    if (start) {
      this.planForm.patchValue({ end_date: start });
    }
  }

  openCreateForm(): void {
    if (!this.canManage) {
      this.toastService.error('You do not have permission to create contribution plans.', 'Permission required');
      return;
    }

    this.editingPlanId = null;
    this.formError = null;
    this.submitAttempted = false;
    this.showForm = true;
    this.resetFormFields(true);
    this.cdr.detectChanges();
    setTimeout(() => {
      document.getElementById('plan-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('plan-name')?.focus();
    }, 0);
  }

  closeForm(): void {
    if (this.saving) {
      return;
    }
    this.showForm = false;
    this.editingPlanId = null;
    this.formError = null;
    this.submitAttempted = false;
  }

  loadPlans(): void {
    const seq = ++this.loadPlansSeq;
    this.plansLoaded = false;
    this.plansLoadError = null;
    this.donationsService.getPlans().subscribe({
      next: (res) => {
        if (seq !== this.loadPlansSeq) {
          return;
        }
        this.plans = Array.isArray(res.data) ? res.data : [];
        this.plansLoaded = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (seq !== this.loadPlansSeq) {
          return;
        }
        console.error('Failed to load contribution plans', err);
        this.plansLoaded = true;
        this.plansLoadError = 'Unable to load contribution plans. Please try again.';
        this.toastService.error(this.plansLoadError, 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  loadFunds(): void {
    this.fundsLoaded = false;
    this.fundsLoadError = null;
    this.donationsService.getFunds().subscribe({
      next: (res) => {
        this.funds = res.data || [];
        this.fundsLoaded = true;
        this.syncFundSelectionWithLoadedFunds();
      },
      error: (err) => {
        console.error('Failed to load collection purposes', err);
        this.fundsLoaded = true;
        this.fundsLoadError = 'Unable to load collection purposes. Please refresh and try again.';
        this.toastService.error(this.fundsLoadError, 'Error');
      }
    });
  }

  onFundSelectOpen(): void {
    this.canCreatePurpose = this.authService.hasPermission('donations.manage');
    this.purposeSearchTerm = '';
    this.attachPurposeFooterDocumentListener();
  }

  onFundSelectClose(): void {
    this.purposeSearchTerm = '';
    this.detachPurposeFooterDocumentListener();
  }

  onFundPurposeSearch(event: { term: string }): void {
    this.purposeSearchTerm = event.term ?? '';
  }

  onFundPurposeChange(fundId: string | null): void {
    if (fundId) {
      this.lastSelectedFundId = fundId;
    }
  }

  onFundSelectKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || !this.canCreatePurpose || this.creatingPurpose) {
      return;
    }
    const term = this.purposeSearchTerm.trim();
    if (!term || this.purposeSearchMatchesAnyFund(term)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.fundSelect?.close();
    this.openPurposeModal(term);
  }

  /**
   * ng-select projects `ng-footer-tmp` into an overlay; footer `(activated)` and host bindings may not wire.
   * Document capture while the panel is open is reliable and runs before the overlay unmounts.
   */
  private attachPurposeFooterDocumentListener(): void {
    this.detachPurposeFooterDocumentListener();
    if (!this.canCreatePurpose) {
      return;
    }
    this.purposeFooterDocListener = (event) => this.handlePurposeFooterDocumentPointerDown(event);
    this.document.addEventListener('mousedown', this.purposeFooterDocListener, true);
  }

  private detachPurposeFooterDocumentListener(): void {
    if (!this.purposeFooterDocListener) {
      return;
    }
    this.document.removeEventListener('mousedown', this.purposeFooterDocListener, true);
    this.purposeFooterDocListener = null;
  }

  handlePurposeFooterDocumentPointerDown(event: MouseEvent): void {
    if (event.button !== 0 || this.creatingPurpose) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.cf-select-create-panel .cf-select-create__btn')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.onAddPurposeFromFooter(this.purposeSearchTerm);
  }

  onAddPurposeFromFooter(searchTerm: string): void {
    if (!this.authService.hasPermission('donations.manage') || this.creatingPurpose) {
      return;
    }
    const prefill = this.prefillPurposeNameFromSearch(searchTerm ?? '');
    this.fundSelect?.close();
    // Open after the overlay unmounts so the modal is not torn down with the panel.
    setTimeout(() => this.openPurposeModal(prefill), 0);
  }

  openPurposeModal(initialName = ''): void {
    this.purposeModalName = initialName;
    this.purposeModalError = null;
    this.purposeModalAttempted = false;
    this.showPurposeModal = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.purposeNameInput?.nativeElement?.focus();
    }, 0);
  }

  closePurposeModal(): void {
    if (this.creatingPurpose) {
      return;
    }
    this.showPurposeModal = false;
    this.purposeModalError = null;
    this.purposeModalAttempted = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.fundSelect?.focus();
    }, 0);
  }

  get purposeDuplicateNameWarning(): boolean {
    const trimmed = this.purposeModalName.trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    return this.funds.some((fund) => fund.name.trim().toLowerCase() === trimmed);
  }

  submitPurposeModal(): void {
    this.purposeModalAttempted = true;
    const name = this.purposeModalName.trim();
    if (!name) {
      this.purposeModalError = 'Enter a purpose name.';
      return;
    }
    if (name.length > 150) {
      this.purposeModalError = 'Purpose name cannot be longer than 150 characters.';
      return;
    }
    if (this.creatingPurpose) {
      return;
    }
    this.createPurposeFromModal(name, false);
  }

  onPurposeModalNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitPurposeModal();
    }
  }

  private createPurposeFromModal(name: string, forceUniqueCode: boolean): void {
    this.creatingPurpose = true;
    this.purposeModalError = null;
    const code = forceUniqueCode
      ? this.suggestPurposeCodeWithTimeSuffix(name)
      : this.suggestPurposeCode(name);

    this.createPurposeSub?.unsubscribe();
    this.createPurposeSub = this.donationsService.createFund({
      name,
      code,
      status: 'active',
    }).subscribe({
      next: (res) => {
        this.creatingPurpose = false;
        this.applyCreatedFund(res.data);
        this.showPurposeModal = false;
        this.purposeModalName = '';
        this.purposeModalAttempted = false;
        this.toastService.success(`"${res.data.name}" added.`, 'Purpose added');
        this.cdr.detectChanges();
        setTimeout(() => this.fundSelect?.focus(), 0);
      },
      error: (err) => {
        if (!forceUniqueCode && this.isFundCodeUniqueViolation(err)) {
          this.createPurposeFromModal(name, true);
          return;
        }
        this.creatingPurpose = false;
        this.purposeModalError = this.parsePurposeApiError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private applyCreatedFund(fund: { id: string; name: string; code: string }): void {
    if (!this.funds.some((f) => f.id === fund.id)) {
      this.funds = [...this.funds, fund].sort((a, b) => a.name.localeCompare(b.name));
    }
    this.lastSelectedFundId = fund.id;
    this.planForm.patchValue({ fund_id: fund.id });
  }

  private prefillPurposeNameFromSearch(term: string): string {
    const trimmed = term.trim();
    if (!trimmed || this.purposeSearchMatchesAnyFund(trimmed)) {
      return '';
    }
    return trimmed;
  }

  /** True when any fund name contains the search text (ng-select default filter). */
  private purposeSearchMatchesAnyFund(term: string): boolean {
    const q = term.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return this.funds.some((fund) => fund.name.toLowerCase().includes(q));
  }

  private isFundCodeUniqueViolation(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    const body = (err as { error?: { message?: string } })?.error;
    const message = (body?.message ?? '').toLowerCase();
    if (status === 422) {
      return message.includes('code') && (message.includes('taken') || message.includes('unique') || message.includes('already'));
    }
    if (status === 500) {
      return message.includes('duplicate') || message.includes('unique') || message.includes('23505');
    }
    return false;
  }

  private parsePurposeApiError(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      return 'Your session has expired. Sign in again and try adding the collection purpose.';
    }
    const body = (err as { error?: ApiErrorBody })?.error ?? (err as ApiErrorBody);
    if (body?.errors) {
      const firstField = Object.keys(body.errors)[0];
      const firstMessage = firstField ? body.errors[firstField]?.[0] : undefined;
      if (firstMessage) {
        return firstMessage;
      }
    }
    const message = body?.message || (err as ApiErrorBody)?.message;
    if (message && message !== 'Validation error' && !this.looksLikeDatabaseError(message)) {
      return message;
    }
    return 'Could not add the collection purpose. Check the name and try again.';
  }

  private looksLikeDatabaseError(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('sqlstate') || lower.includes('duplicate key') || lower.includes('23505');
  }

  private suggestPurposeCodeWithTimeSuffix(name: string): string {
    const base = this.suggestPurposeCode(name);
    const suffix = Date.now().toString().slice(-6);
    return `${base.slice(0, Math.max(1, 60 - suffix.length - 1))}-${suffix}`;
  }

  loadFamilies(): void {
    this.familyService.getFamilies({ per_page: 200, status: 'active' }).subscribe({
      next: (res) => { this.families = res.data || []; }
    });
  }

  addAssignment(): void {
    if (!this.selectedFamilyId || this.assignmentAmount <= 0) {
      return;
    }
    this.draftAssignments.push({
      family_id: this.selectedFamilyId,
      amount: this.assignmentAmount,
      effective_from: this.assignmentEffectiveFrom,
      status: 'active'
    });
    this.selectedFamilyId = '';
    this.assignmentAmount = 0;
    this.formError = null;
  }

  removeAssignment(index: number): void {
    this.draftAssignments.splice(index, 1);
  }

  familyName(familyId: string): string {
    return this.families.find((f) => f.id === familyId)?.family_name || familyId;
  }

  editPlan(plan: ContributionPlan): void {
    this.editingPlanId = plan.id;
    this.showForm = true;
    this.formError = null;
    this.submitAttempted = false;
    this.draftAssignments = [];
    this.donationsService.getPlan(plan.id).subscribe({
      next: (res) => {
        const loaded = res.data ?? plan;
        this.lastSelectedFundId = loaded.fund_id ?? null;
        this.planForm.patchValue({
          name: loaded.name,
          code: loaded.code,
          fund_id: loaded.fund_id,
          plan_type: loaded.plan_type || 'uniform',
          frequency: loaded.frequency,
          custom_interval_days: loaded.custom_interval_days || 30,
          default_amount: loaded.default_amount,
          start_date: toDateInputValue(loaded.start_date),
          end_date: toDateInputValue(loaded.end_date),
          auto_generate: loaded.auto_generate ?? true,
          status: loaded.status
        });
        this.assignmentEffectiveFrom = toDateInputValue(loaded.start_date) || localDateOnly();
        this.cdr.detectChanges();
        setTimeout(() => {
          document.getElementById('plan-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          document.getElementById('plan-name')?.focus();
        }, 0);
      },
      error: () => {
        this.lastSelectedFundId = plan.fund_id ?? null;
        this.planForm.patchValue({
          name: plan.name,
          code: plan.code,
          fund_id: plan.fund_id,
          plan_type: plan.plan_type || 'uniform',
          frequency: plan.frequency,
          custom_interval_days: plan.custom_interval_days || 30,
          default_amount: plan.default_amount,
          start_date: toDateInputValue(plan.start_date),
          end_date: toDateInputValue(plan.end_date),
          auto_generate: plan.auto_generate ?? true,
          status: plan.status
        });
        this.assignmentEffectiveFrom = toDateInputValue(plan.start_date) || localDateOnly();
        this.cdr.detectChanges();
      }
    });
  }

  savePlan(): void {
    if (this.saving) {
      return;
    }

    this.submitAttempted = true;
    this.formError = null;
    this.planForm.markAllAsTouched();

    if (this.planForm.value.frequency === 'custom' && !this.planForm.value.custom_interval_days) {
      this.planForm.get('custom_interval_days')?.setErrors({ required: true });
    }

    const name = (this.planForm.value.name || '').trim();
    const duplicateName = this.plans.some(
      (plan) => plan.name.toLowerCase() === name.toLowerCase() && plan.id !== this.editingPlanId
    );
    if (duplicateName) {
      this.planForm.get('name')?.setErrors({ duplicateName: true });
    }

    if (!this.fundsLoaded) {
      this.formError = 'Collection purposes are still loading. Please wait a moment.';
      return;
    }

    if (this.fundsLoadError) {
      this.formError = this.fundsLoadError;
      return;
    }

    if (this.planForm.value.plan_type === 'individual' && !this.draftAssignments.length && !this.editingPlanId) {
      this.formError = 'Add at least one family amount for per-family plans.';
      return;
    }

    if (!this.funds.length) {
      this.formError = 'Add a collection purpose before creating this plan.';
      return;
    }

    this.syncFundSelectionWithLoadedFunds();

    if (this.planForm.invalid) {
      this.formError = this.formValidationSummary;
      this.toastService.error(this.formValidationSummary, 'Complete required fields');
      return;
    }

    this.saving = true;
    const isEdit = !!this.editingPlanId;
    const raw = this.planForm.getRawValue();
    const code = (raw.code || '').trim() || this.suggestPlanCode(raw.name || '');

    const payload: Record<string, unknown> = {
      name,
      code,
      fund_id: raw.fund_id,
      plan_type: raw.plan_type,
      frequency: raw.frequency,
      custom_interval_days: raw.frequency === 'custom' ? Number(raw.custom_interval_days) : null,
      default_amount: Number(raw.default_amount),
      start_date: raw.start_date,
      end_date: raw.end_date || null,
      auto_generate: !!raw.auto_generate,
      status: raw.status,
      assignments: raw.plan_type === 'individual' ? this.draftAssignments : []
    };

    const request$ = this.editingPlanId
      ? this.donationsService.updatePlan(this.editingPlanId, payload)
      : this.donationsService.createPlan(payload);

    request$.subscribe({
      next: (res) => {
        this.saving = false;
        this.submitAttempted = false;
        const saved = res.data;
        if (saved) {
          const without = this.plans.filter((p) => p.id !== saved.id);
          this.plans = [saved, ...without];
          this.highlightPlanId = saved.id;
          setTimeout(() => { this.highlightPlanId = null; }, 4000);
        } else {
          this.loadPlans();
        }
        this.showForm = false;
        this.editingPlanId = null;
        this.resetFormFields(false);
        this.toastService.success(
          isEdit ? 'Contribution plan updated successfully.' : 'Contribution plan created successfully.',
          'Success'
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.formError = this.parseApiError(err);
        this.toastService.error(this.formError, 'Could not save plan');
      }
    });
  }

  generateDues(plan: ContributionPlan): void {
    this.donationsService.previewPlanGeneration(plan.id).pipe(
      switchMap((previewRes) => {
        const preview = previewRes.data;
        const periodCount = preview?.period_count ?? 0;
        const familyCount = preview?.family_count ?? 0;
        const firstPeriod = preview?.periods?.[0]?.period_label ?? '';
        const lastPeriod = preview?.periods?.[preview.periods.length - 1]?.period_label ?? '';
        const rangeLine = periodCount > 0
          ? `\n\nEligible periods: ${firstPeriod} through ${lastPeriod} (${periodCount} period${periodCount === 1 ? '' : 's'}).`
          : '\n\nNo eligible periods right now.';
        const familyLine = familyCount > 0
          ? `\nFamilies affected: about ${familyCount}.`
          : '';

        return this.confirmationDialog.confirm({
          title: 'Generate contribution schedule',
          message: `Create installment dues for "${plan.name}"?${rangeLine}${familyLine}\n\nExisting installments will be skipped.`,
          confirmText: 'Generate schedule',
          variant: 'primary',
        });
      }),
      filter((result) => result.confirmed),
    ).subscribe({
      next: () => {
        this.generatingPlanId = plan.id;
        this.donationsService.generatePlanDues(plan.id, { generate_full_schedule: true }).subscribe({
          next: (res) => this.handleGenerateDuesResponse(res),
          error: (err) => {
            this.generatingPlanId = null;
            this.toastService.error(this.parseApiError(err), 'Could not generate dues');
          }
        });
      },
      error: (err) => {
        this.toastService.error(this.parseApiError(err), 'Could not preview schedule');
      }
    });
  }

  private handleGenerateDuesResponse(res: { data: { generated_count?: number; unchanged_count?: number; status?: string; period_count?: number; family_count?: number } | ContributionDue[] }): void {
    this.generatingPlanId = null;
    const data = res.data;
    if (Array.isArray(data)) {
      this.toastService.success(`${data.length} dues created.`, 'Dues generated');
      return;
    }
    if (data?.status === 'queued') {
      this.toastService.success('Schedule generation queued in the background.', 'Dues generating');
      return;
    }
    const created = data?.generated_count ?? 0;
    const skipped = data?.unchanged_count ?? 0;
    const periods = data?.period_count ?? 0;
    const families = data?.family_count ?? 0;
    if (created === 0 && skipped > 0) {
      this.toastService.success(`No new dues — ${skipped} installment(s) already on file across ${periods} period(s).`, 'Schedule up to date');
      return;
    }
    this.toastService.success(
      `New: ${created}. Already on file: ${skipped}. Families: ${families}. Periods: ${periods}.`,
      'Schedule generated'
    );
  }

  private parseApiError(err: unknown): string {
    const body = (err as { error?: ApiErrorBody })?.error ?? (err as ApiErrorBody);
    if (body?.errors) {
      const firstField = Object.keys(body.errors)[0];
      const firstMessage = firstField ? body.errors[firstField]?.[0] : undefined;
      if (firstMessage) {
        return firstMessage;
      }
    }
    const message = body?.message || (err as ApiErrorBody)?.message;
    if (message && message !== 'Validation error') {
      return message;
    }
    return 'Could not save the plan. Check your entries and try again.';
  }

  /** Keeps an existing selection valid; does not auto-pick the first fund (placeholder stays visible). */
  private syncFundSelectionWithLoadedFunds(): void {
    if (!this.funds.length) {
      return;
    }
    const currentFundId = this.planForm.get('fund_id')?.value;
    if (!currentFundId) {
      return;
    }
    if (!this.funds.some((f) => f.id === currentFundId)) {
      this.planForm.patchValue({ fund_id: null });
      this.lastSelectedFundId = null;
    }
  }

  private resetPurposeEntryState(): void {
    this.lastSelectedFundId = null;
    this.showPurposeModal = false;
    this.purposeModalName = '';
    this.purposeModalError = null;
    this.purposeModalAttempted = false;
  }

  private suggestPlanCode(name: string): string {
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
    const suffix = Date.now().toString().slice(-6);
    return slug ? `${slug}-${suffix}` : `PLAN-${suffix}`;
  }

  private suggestPurposeCode(name: string): string {
    const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
    const slug = base || `PURPOSE-${Date.now().toString().slice(-6)}`;
    const existing = new Set(this.funds.map((fund) => fund.code.toUpperCase()));
    if (!existing.has(slug)) {
      return slug;
    }
    for (let i = 2; i < 100; i++) {
      const candidate = `${slug.slice(0, 17)}-${i}`;
      if (!existing.has(candidate)) {
        return candidate;
      }
    }
    return `${slug.slice(0, 12)}-${Date.now().toString().slice(-6)}`;
  }

  private resetFormFields(keepFormOpen = false): void {
    if (!keepFormOpen) {
      this.showForm = false;
    }
    this.draftAssignments = [];
    this.resetPurposeEntryState();
    this.planForm.reset({
      plan_type: 'uniform',
      frequency: 'monthly',
      custom_interval_days: 30,
      default_amount: null,
      auto_generate: true,
      status: 'active',
      start_date: localDateOnly(),
      end_date: '',
      fund_id: null,
      code: '',
      name: ''
    });
    this.syncFundSelectionWithLoadedFunds();
  }
}
