import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { CfDateFieldComponent } from '@shared/components/cf-date-field/cf-date-field.component';
import { apiErrorMessage } from '@core/errors/api-error';
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
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
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
import { formatFamilyPickerLabel } from '@shared/utils/family-display.util';
import { localDateOnly } from '../utils/local-date-only';
import { toDateInputValue } from '../utils/to-date-input-value';

type AssignmentAddResult = 'added' | 'duplicate' | 'invalid_family' | 'invalid_amount' | 'empty';

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
    CfDatePipe,
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
  private readonly actions = inject(ActionAuthorizationService);
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
  savedExceptions: ContributionPlanAssignment[] = [];
  selectedFamilyId = '';
  assignmentAmount = 0;
  assignmentEffectiveFrom = localDateOnly();
  exceptionFamilyId = '';
  exceptionAmount = 0;
  exceptionExempt = false;
  exceptionEffectiveFrom = localDateOnly();
  exceptionSaving = false;
  billingSummary: string | null = null;
  showForm = false;
  editingPlanId: string | null = null;
  saving = false;
  submitAttempted = false;
  formError: string | null = null;
  highlightPlanId: string | null = null;
  canManage = false;
  generatingPlanId: string | null = null;
  assignmentAddHint: string | null = null;

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
    this.canManage = this.actions.allows('donations.manage');
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

  get editedPlan(): ContributionPlan | undefined {
    return this.plans.find((plan) => plan.id === this.editingPlanId);
  }

  get assignmentSectionError(): string | null {
    if (!this.submitAttempted || this.planForm.value.plan_type !== 'individual') {
      return null;
    }
    if (this.formError) {
      return null;
    }
    if (!this.draftAssignments.length) {
      if (this.hasPendingAssignmentRow()) {
        return 'Choose a family and enter an amount greater than zero, then add—or save to add a completed row.';
      }
      return 'Add at least one family amount.';
    }
    return null;
  }

  get formValidationSummary(): string {
    if (this.planForm.value.plan_type === 'individual' && !this.draftAssignments.length) {
      return this.assignmentSectionError || 'Add at least one family amount before saving.';
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
    const planType = checked ? 'uniform' : 'individual';
    this.planForm.patchValue({ plan_type: planType });
    this.applyPlanTypeValidators(planType);
    this.assignmentAddHint = null;
    if (planType === 'uniform') {
      this.clearAssignmentEntryRow();
      this.draftAssignments = [];
    }
  }

  onFrequencyChange(): void {
    if (this.planForm.value.frequency === 'one_time') {
      this.planForm.patchValue({ auto_generate: false });
      const start = this.planForm.value.start_date;
      if (start && !this.planForm.value.end_date) {
        this.planForm.patchValue({ end_date: start });
      }
      return;
    }
    this.planForm.patchValue({ auto_generate: true });
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
    this.billingSummary = null;
    this.savedExceptions = [];
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
        this.plansLoadError = apiErrorMessage(err, 'Unable to load contribution plans. Please try again.');
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
        this.fundsLoadError = apiErrorMessage(err, 'Unable to load collection purposes. Please refresh and try again.');
        this.toastService.error(this.fundsLoadError, 'Error');
      }
    });
  }

  onFundSelectOpen(): void {
    this.canCreatePurpose = this.actions.allows('donations.manage');
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
    if (!this.actions.allows('donations.manage') || this.creatingPurpose) {
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
    const result = this.tryAddAssignment();
    if (result === 'invalid_family') {
      this.assignmentAddHint = 'Choose a family.';
      return;
    }
    if (result === 'invalid_amount') {
      this.assignmentAddHint = 'Enter an amount greater than zero.';
      return;
    }
    if (result === 'duplicate') {
      this.assignmentAddHint = 'That family is already listed.';
      return;
    }
    if (result === 'added') {
      this.assignmentAddHint = null;
      this.formError = null;
    }
  }

  removeAssignment(index: number): void {
    this.draftAssignments.splice(index, 1);
  }

  familyName(familyId: string): string {
    const family = this.families.find((f) => f.id === familyId);
    if (family) {
      return formatFamilyPickerLabel(family);
    }
    return familyId;
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
        this.exceptionEffectiveFrom = this.assignmentEffectiveFrom;
        this.billingSummary = null;
        this.applyPlanTypeValidators(loaded.plan_type === 'individual' ? 'individual' : 'uniform');
        this.hydrateDraftAssignmentsFromPlan(loaded);
        this.syncExceptionsForPlanType(loaded.plan_type || 'uniform', plan.id);
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
        this.exceptionEffectiveFrom = this.assignmentEffectiveFrom;
        this.billingSummary = null;
        this.applyPlanTypeValidators(plan.plan_type === 'individual' ? 'individual' : 'uniform');
        this.hydrateDraftAssignmentsFromPlan(plan);
        this.syncExceptionsForPlanType(plan.plan_type || 'uniform', plan.id);
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

    if (this.planForm.value.plan_type === 'individual') {
      if (!this.commitPendingAssignmentBeforeSave()) {
        return;
      }
      if (!this.draftAssignments.length) {
        this.formError = 'Add at least one family amount for per-family plans.';
        return;
      }
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

    const isIndividual = raw.plan_type === 'individual';
    const defaultAmount = isIndividual
      ? this.individualDefaultAmountFromAssignments()
      : Number(raw.default_amount);

    const payload: Record<string, unknown> = {
      name,
      code,
      fund_id: raw.fund_id,
      plan_type: raw.plan_type,
      frequency: raw.frequency,
      custom_interval_days: raw.frequency === 'custom' ? Number(raw.custom_interval_days) : null,
      default_amount: defaultAmount,
      start_date: raw.start_date,
      end_date: raw.end_date || null,
      auto_generate: !!raw.auto_generate,
      status: raw.status,
      assignments: isIndividual ? this.buildAssignmentsPayload() : []
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
          this.editingPlanId = saved.id;
          this.showForm = true;
          if (saved.code) {
            this.planForm.patchValue({ code: saved.code, status: saved.status });
          }
          this.applyPlanTypeValidators(saved.plan_type === 'individual' ? 'individual' : 'uniform');
          this.hydrateDraftAssignmentsFromPlan(saved);
          this.syncExceptionsForPlanType(saved.plan_type || 'uniform', saved.id);
          setTimeout(() => { this.highlightPlanId = null; }, 4000);
        } else {
          this.loadPlans();
        }
        this.toastService.success(
          isEdit
            ? 'Plan saved. Add any exceptions, then bill eligible families.'
            : 'Plan saved. Add any exceptions, then bill eligible families.',
          'Saved'
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

  billEligibleFamilies(): void {
    const plan = this.plans.find((row) => row.id === this.editingPlanId);
    if (!plan) {
      this.toastService.error('Save the plan before billing families.', 'Save the plan');
      return;
    }
    if (plan.status === 'inactive') {
      this.toastService.error('This plan is closed. Reopen it before billing families.', 'Plan closed');
      return;
    }
    this.generateDues(plan);
  }

  generateDues(plan: ContributionPlan): void {
    if (plan.status === 'inactive') {
      this.toastService.error('This plan is closed. Reopen it before billing families.', 'Plan closed');
      return;
    }
    this.donationsService.previewPlanGeneration(plan.id).pipe(
      switchMap((previewRes) => {
        const preview = previewRes.data;
        const eligible = preview?.eligible_family_count ?? 0;
        const exempt = preview?.exempt_family_count ?? 0;
        const already = preview?.already_billed_count ?? 0;
        const expected = this.formatParishAmount(preview?.expected_new_amount ?? 0);
        return this.confirmationDialog.confirm({
          title: 'Bill eligible families',
          message: `Bill eligible families for "${plan.name}"?\n\nFamilies who will receive a new bill: ${eligible}.\nExempt: ${exempt}.\nAlready billed and left unchanged: ${already}.\nNew bills total: ${expected}.\n\nEach new bill is an outstanding expected amount. Cancel writes nothing.`,
          confirmText: 'Bill eligible families',
          variant: 'primary',
        });
      }),
      filter((result) => result.confirmed),
    ).subscribe({
      next: () => {
        this.generatingPlanId = plan.id;
        this.donationsService.generatePlanDues(plan.id, { generate_full_schedule: true }).subscribe({
          next: (res) => this.handleGenerateDuesResponse(plan.id, res),
          error: (err) => {
            this.generatingPlanId = null;
            this.toastService.error(this.parseApiError(err), 'Could not bill families');
          }
        });
      },
      error: (err) => {
        this.toastService.error(this.parseApiError(err), 'Could not preview families');
      }
    });
  }

  closePlan(): void {
    const plan = this.plans.find((row) => row.id === this.editingPlanId);
    if (!plan || plan.status === 'inactive') {
      return;
    }
    this.confirmationDialog.confirm({
      title: 'Close plan',
      message: `Stop new bills for "${plan.name}"? Existing bills and payments stay on file.`,
      confirmText: 'Close plan',
      variant: 'primary',
    }).pipe(filter((result) => result.confirmed)).subscribe(() => {
      this.donationsService.updatePlan(plan.id, { status: 'inactive' }).subscribe({
        next: (res) => {
          if (res.data) {
            this.plans = this.plans.map((row) => row.id === res.data.id ? res.data : row);
            this.planForm.patchValue({ status: 'inactive' });
          }
          this.toastService.success('Plan closed. Existing bills and payments stay on file.', 'Plan closed');
          this.cdr.detectChanges();
        },
        error: (err) => this.toastService.error(this.parseApiError(err), 'Could not close plan'),
      });
    });
  }

  saveException(): void {
    if (!this.editingPlanId || this.exceptionSaving) {
      return;
    }
    if (!this.exceptionFamilyId) {
      this.toastService.error('Choose the family who differs from the standard amount.', 'Family required');
      return;
    }
    if (!this.exceptionExempt && this.exceptionAmount <= 0) {
      this.toastService.error('Enter the amount for this family, or mark them exempt.', 'Amount required');
      return;
    }
    this.exceptionSaving = true;
    this.donationsService.savePlanAssignment(this.editingPlanId, {
      family_id: this.exceptionFamilyId,
      amount: this.exceptionExempt ? 0 : this.exceptionAmount,
      effective_from: this.exceptionEffectiveFrom || this.planForm.value.start_date || localDateOnly(),
      is_exempt: this.exceptionExempt,
      status: 'active',
    }).subscribe({
      next: () => {
        this.exceptionSaving = false;
        this.exceptionFamilyId = '';
        this.exceptionAmount = 0;
        this.exceptionExempt = false;
        this.loadExceptions(this.editingPlanId as string);
        this.toastService.success('Exception saved. It applies the next time you bill families.', 'Exception saved');
      },
      error: (err) => {
        this.exceptionSaving = false;
        this.toastService.error(this.parseApiError(err), 'Could not save exception');
      }
    });
  }

  loadExceptions(planId: string): void {
    this.donationsService.getPlanAssignments(planId).subscribe({
      next: (res) => {
        const page = res.data;
        this.savedExceptions = Array.isArray(page?.data) ? page.data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.savedExceptions = [];
      }
    });
  }

  private handleGenerateDuesResponse(planId: string, res: { data: { generated_count?: number; unchanged_count?: number; exempt_skipped_count?: number; status?: string; period_count?: number; family_count?: number } | ContributionDue[] }): void {
    this.generatingPlanId = null;
    const data = res.data;
    if (Array.isArray(data)) {
      this.billingSummary = `Created ${data.length}.`;
      this.toastService.success(this.billingSummary, 'Families billed');
      this.refreshEditedPlan(planId);
      return;
    }
    if (data?.status === 'queued') {
      this.billingSummary = 'Billing was queued because this parish has a large number of families.';
      this.toastService.success(this.billingSummary, 'Billing queued');
      return;
    }
    const created = data?.generated_count ?? 0;
    const skipped = data?.unchanged_count ?? 0;
    const exempt = data?.exempt_skipped_count ?? 0;
    this.billingSummary = `Created ${created}. Already on file: ${skipped}. Exempt and not billed: ${exempt}.`;
    this.toastService.success(this.billingSummary, created === 0 ? 'Already billed' : 'Families billed');
    this.refreshEditedPlan(planId);
  }

  private refreshEditedPlan(planId: string): void {
    this.donationsService.getPlan(planId).subscribe({
      next: (res) => {
        if (!res.data) {
          return;
        }
        this.plans = this.plans.map((row) => row.id === res.data.id ? { ...row, ...res.data } : row);
        this.cdr.detectChanges();
      }
    });
  }

  private formatParishAmount(amount: number): string {
    const formatted = this.churchCurrency.formatAmount(amount);
    return formatted || String(amount);
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
    this.savedExceptions = [];
    this.billingSummary = null;
    this.exceptionFamilyId = '';
    this.exceptionAmount = 0;
    this.exceptionExempt = false;
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
    this.clearAssignmentEntryRow();
    this.assignmentAddHint = null;
    this.applyPlanTypeValidators('uniform');
    this.syncFundSelectionWithLoadedFunds();
  }

  private parseAssignmentAmount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0.01) {
      return null;
    }
    return amount;
  }

  private hasPendingAssignmentRow(): boolean {
    const hasFamily = !!this.selectedFamilyId?.trim();
    const hasAmount = this.parseAssignmentAmount(this.assignmentAmount) !== null;
    return hasFamily || hasAmount;
  }

  private tryAddAssignment(): AssignmentAddResult {
    const familyId = this.selectedFamilyId?.trim();
    const amount = this.parseAssignmentAmount(this.assignmentAmount);
    if (!familyId && amount === null) {
      return 'empty';
    }
    if (!familyId) {
      return 'invalid_family';
    }
    if (amount === null) {
      return 'invalid_amount';
    }
    if (this.draftAssignments.some((row) => row.family_id === familyId)) {
      return 'duplicate';
    }
    this.draftAssignments.push({
      family_id: familyId,
      amount,
      effective_from: this.assignmentEffectiveFrom || this.planForm.value.start_date || localDateOnly(),
      status: 'active',
    });
    this.clearAssignmentEntryRow();
    return 'added';
  }

  private commitPendingAssignmentBeforeSave(): boolean {
    if (this.planForm.value.plan_type !== 'individual') {
      return true;
    }
    if (!this.hasPendingAssignmentRow()) {
      return true;
    }
    const result = this.tryAddAssignment();
    if (result === 'added' || result === 'empty') {
      return true;
    }
    if (result === 'duplicate') {
      this.formError = 'That family is already in the list. Remove the duplicate or pick another family.';
      return false;
    }
    this.formError = 'Choose a family and enter an amount greater than zero for each row, or clear the row before saving.';
    return false;
  }

  private applyPlanTypeValidators(planType: 'uniform' | 'individual'): void {
    const control = this.planForm.get('default_amount');
    if (!control) {
      return;
    }
    if (planType === 'uniform') {
      control.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private clearAssignmentEntryRow(): void {
    this.selectedFamilyId = '';
    this.assignmentAmount = 0;
  }

  private individualDefaultAmountFromAssignments(): number {
    if (!this.draftAssignments.length) {
      return 0.01;
    }
    const amounts = this.draftAssignments
      .map((row) => Number(row.amount))
      .filter((amount) => Number.isFinite(amount) && amount >= 0.01);
    return amounts.length ? Math.min(...amounts) : 0.01;
  }

  private buildAssignmentsPayload(): Array<{
    family_id: string;
    amount: number;
    effective_from: string;
    status: string;
  }> {
    const fallbackDate = this.planForm.value.start_date || localDateOnly();
    return this.draftAssignments.map((row) => ({
      family_id: row.family_id,
      amount: Number(row.amount),
      effective_from: row.effective_from || fallbackDate,
      status: row.status || 'active',
    }));
  }

  private hydrateDraftAssignmentsFromPlan(plan: ContributionPlan): void {
    if (plan.plan_type !== 'individual') {
      this.draftAssignments = [];
      return;
    }
    const rows = plan.assignments;
    if (!rows?.length) {
      this.draftAssignments = [];
      return;
    }
    this.draftAssignments = rows.map((row) => ({
      family_id: row.family_id,
      amount: Number(row.amount),
      effective_from: toDateInputValue(row.effective_from) || this.assignmentEffectiveFrom,
      status: row.status ?? 'active',
    }));
  }

  private syncExceptionsForPlanType(planType: string, planId: string): void {
    if (planType === 'uniform') {
      this.loadExceptions(planId);
      return;
    }
    this.savedExceptions = [];
  }
}
