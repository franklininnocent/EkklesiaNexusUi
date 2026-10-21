import { CfDateFieldComponent } from '@shared/components/cf-date-field/cf-date-field.component';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CfSelectCreateFooterComponent } from '@shared/components/cf-select-create-footer/cf-select-create-footer.component';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { DonationsService } from '../services/donations.service';
import { DonationCategory, Donor, RecurringDonationSchedule } from '../models/donation.model';
import { refreshStewardshipView, setupStewardshipRouteReload } from '../utils/stewardship-view.util';
import { localDateOnly } from '../utils/local-date-only';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { CfActionIconComponent } from '@shared/components/cf-action-icon/cf-action-icon.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { Subscription } from 'rxjs';

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/** Panel class scoped so document capture only handles this screen’s donor footer. */
export const RECURRING_DONOR_SELECT_PANEL_CLASS = 'recurring-donor-create-panel';

@Component({
  selector: 'app-donations-recurring',
  standalone: true,
  imports: [CfDateFieldComponent, 
    CfDatePipe,
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
    CfSelectCreateFooterComponent,
    ModalShellComponent,
  ],
  templateUrl: './donations-recurring.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './donations-recurring.component.scss',
})
export class DonationsRecurringComponent implements OnInit, OnDestroy {
  @ViewChild('donorSelect') donorSelect?: NgSelectComponent;
  @ViewChild('donorModalNameInput') donorModalNameInput?: ElementRef<HTMLInputElement>;

  schedules: RecurringDonationSchedule[] = [];
  schedulesLoaded = false;
  donors: Donor[] = [];
  donorsLoaded = false;
  donorsLoadError: string | null = null;
  private loadDonorsSeq = 0;
  categories: DonationCategory[] = [];
  tableSearch = '';
  showForm = false;
  saving = false;
  running = false;
  canCollect = false;
  canCreateDonor = false;
  donorSearchTerm = '';
  creatingDonor = false;
  showDonorModal = false;
  donorModalError: string | null = null;
  donorModalForm = this.fb.group({
    name: ['', Validators.required],
    email: [''],
    phone: [''],
    donor_type: ['external'],
  });
  private readonly document = inject(DOCUMENT);
  private donorFooterDocListener: ((event: MouseEvent) => void) | null = null;
  private createDonorSub?: Subscription;

  form = this.fb.group({
    donor_id: [null as string | null],
    donation_category_id: [''],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    frequency: ['monthly', Validators.required],
    next_run_on: [localDateOnly(), Validators.required],
    status: ['active'],
  });

  constructor(
    private fb: FormBuilder,
    private donationsService: DonationsService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.canCollect = this.authService.hasPermission('donations.collect');
    this.loadDonors();
    this.donationsService.getCategories().subscribe({
      next: (res) => {
        this.categories = res.data ?? [];
        refreshStewardshipView(this.cdr);
      },
    });
    this.load();
    setupStewardshipRouteReload(this.router, this.destroyRef, '/donations/recurring', () => this.load());
  }

  ngOnDestroy(): void {
    this.detachDonorFooterDocumentListener();
    this.createDonorSub?.unsubscribe();
  }

  get activeCount(): number {
    return this.schedules.filter((schedule) => schedule.status === 'active').length;
  }

  get dueSoonCount(): number {
    return this.schedules.filter((schedule) => this.isDueSoon(schedule)).length;
  }

  get filteredSchedules(): RecurringDonationSchedule[] {
    const query = this.tableSearch.trim().toLowerCase();
    if (!query) {
      return this.schedules;
    }
    return this.schedules.filter((schedule) =>
      [schedule.frequency, schedule.status, String(schedule.amount)].join(' ').toLowerCase().includes(query),
    );
  }

  get donorDuplicateNameWarning(): boolean {
    const trimmed = (this.donorModalForm.value.name ?? '').trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    return this.donors.some((donor) => donor.name.trim().toLowerCase() === trimmed);
  }

  isDueSoon(schedule: RecurringDonationSchedule): boolean {
    if (schedule.status !== 'active' || !schedule.next_run_on) {
      return false;
    }
    const days = Math.ceil((new Date(schedule.next_run_on).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7;
  }

  loadDonors(): void {
    const seq = ++this.loadDonorsSeq;
    this.donorsLoaded = false;
    this.donorsLoadError = null;
    refreshStewardshipView(this.cdr);
    this.donationsService.getDonors().subscribe({
      next: (res) => {
        if (seq !== this.loadDonorsSeq) {
          return;
        }
        this.donors = res.data?.data ?? [];
        this.donorsLoaded = true;
        refreshStewardshipView(this.cdr);
      },
      error: () => {
        if (seq !== this.loadDonorsSeq) {
          return;
        }
        this.donorsLoadError = 'Unable to load donors. Please try again.';
        this.donorsLoaded = true;
        refreshStewardshipView(this.cdr);
      },
    });
  }

  load(): void {
    this.schedulesLoaded = false;
    refreshStewardshipView(this.cdr);
    this.donationsService.getRecurringSchedules().subscribe({
      next: (res) => {
        this.schedules = res.data?.data ?? [];
        this.schedulesLoaded = true;
        refreshStewardshipView(this.cdr);
      },
      error: () => {
        this.schedules = [];
        this.schedulesLoaded = true;
        refreshStewardshipView(this.cdr);
      },
    });
  }

  onDonorSelectOpen(): void {
    this.canCreateDonor = this.authService.hasPermission('donations.manage');
    this.donorSearchTerm = '';
    this.attachDonorFooterDocumentListener();
  }

  onDonorSelectClose(): void {
    this.donorSearchTerm = '';
    this.detachDonorFooterDocumentListener();
  }

  onDonorSearch(event: { term: string }): void {
    this.donorSearchTerm = event.term ?? '';
  }

  onDonorSelectKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || !this.canCreateDonor || this.creatingDonor) {
      return;
    }
    const term = this.donorSearchTerm.trim();
    if (!term || this.donorSearchMatchesAny(term)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.donorSelect?.close();
    this.openDonorModal(term);
  }

  private attachDonorFooterDocumentListener(): void {
    this.detachDonorFooterDocumentListener();
    if (!this.canCreateDonor) {
      return;
    }
    this.donorFooterDocListener = (event) => this.handleDonorFooterDocumentPointerDown(event);
    this.document.addEventListener('mousedown', this.donorFooterDocListener, true);
  }

  private detachDonorFooterDocumentListener(): void {
    if (!this.donorFooterDocListener) {
      return;
    }
    this.document.removeEventListener('mousedown', this.donorFooterDocListener, true);
    this.donorFooterDocListener = null;
  }

  handleDonorFooterDocumentPointerDown(event: MouseEvent): void {
    if (event.button !== 0 || this.creatingDonor) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const selector = `.${RECURRING_DONOR_SELECT_PANEL_CLASS} .cf-select-create__btn`;
    if (!target?.closest(selector)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.onAddDonorFromFooter();
  }

  onAddDonorFromFooter(): void {
    if (!this.authService.hasPermission('donations.manage') || this.creatingDonor) {
      return;
    }
    const prefill = this.prefillDonorNameFromSearch(this.donorSearchTerm);
    this.donorSelect?.close();
    setTimeout(() => this.openDonorModal(prefill), 0);
  }

  openDonorModal(initialName = ''): void {
    this.donorModalForm.reset({
      name: initialName,
      email: '',
      phone: '',
      donor_type: 'external',
    });
    this.donorModalError = null;
    this.showDonorModal = true;
    this.cdr.detectChanges();
    setTimeout(() => this.donorModalNameInput?.nativeElement?.focus(), 0);
  }

  closeDonorModal(): void {
    if (this.creatingDonor) {
      return;
    }
    this.showDonorModal = false;
    this.donorModalError = null;
    this.donorModalForm.reset({ name: '', email: '', phone: '', donor_type: 'external' });
    this.cdr.detectChanges();
    setTimeout(() => this.donorSelect?.focus(), 0);
  }

  submitDonorModal(): void {
    if (this.donorModalForm.invalid) {
      this.donorModalForm.markAllAsTouched();
      return;
    }
    if (this.creatingDonor) {
      return;
    }
    const raw = this.donorModalForm.getRawValue();
    const payload: Record<string, unknown> = { ...raw };
    if (!String(payload['email'] ?? '').trim()) {
      delete payload['email'];
    }
    if (!String(payload['phone'] ?? '').trim()) {
      delete payload['phone'];
    }
    this.creatingDonor = true;
    this.donorModalError = null;
    this.createDonorSub?.unsubscribe();
    this.createDonorSub = this.donationsService.createDonor(payload).subscribe({
      next: (res) => {
        this.creatingDonor = false;
        this.applyCreatedDonor(res.data);
        this.showDonorModal = false;
        this.donorModalForm.reset({ name: '', email: '', phone: '', donor_type: 'external' });
        this.toastService.success(`"${res.data.name}" added.`, 'Donor added');
        this.cdr.detectChanges();
        setTimeout(() => this.donorSelect?.focus(), 0);
      },
      error: (err) => {
        this.creatingDonor = false;
        this.donorModalError = this.parseDonorApiError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private applyCreatedDonor(donor: Donor): void {
    if (!this.donors.some((d) => d.id === donor.id)) {
      this.donors = [...this.donors, donor].sort((a, b) => a.name.localeCompare(b.name));
    }
    this.form.patchValue({ donor_id: donor.id });
  }

  private prefillDonorNameFromSearch(term: string): string {
    const trimmed = term.trim();
    if (!trimmed || this.donorSearchMatchesAny(trimmed)) {
      return '';
    }
    return trimmed;
  }

  private donorSearchMatchesAny(term: string): boolean {
    const q = term.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return this.donors.some((donor) => donor.name.toLowerCase().includes(q));
  }

  private parseDonorApiError(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      return 'Your session has expired. Sign in again and try adding the donor.';
    }
    const body = (err as { error?: ApiErrorBody })?.error ?? (err as ApiErrorBody);
    if (body?.errors) {
      const firstField = Object.keys(body.errors)[0];
      const firstMessage = firstField ? body.errors[firstField]?.[0] : undefined;
      if (firstMessage) {
        return firstMessage;
      }
    }
    const message = body?.message;
    if (message && message !== 'Validation error') {
      return message;
    }
    return 'Could not add the donor. Check the name and try again.';
  }

  openCreateForm(): void {
    this.showForm = true;
    this.form.patchValue({
      donor_id: null,
      amount: null,
      frequency: 'monthly',
      next_run_on: localDateOnly(),
      status: 'active',
    });
    refreshStewardshipView(this.cdr);
    setTimeout(() => document.getElementById('recurring-amount')?.focus(), 0);
  }

  closeForm(): void {
    if (this.saving || this.creatingDonor) {
      return;
    }
    this.showDonorModal = false;
    this.showForm = false;
    refreshStewardshipView(this.cdr);
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;
    refreshStewardshipView(this.cdr);
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = { ...raw };
    if (!payload['donor_id']) delete payload['donor_id'];
    if (!payload['donation_category_id']) delete payload['donation_category_id'];
    this.donationsService.createRecurringSchedule(payload).subscribe({
      next: () => {
        this.saving = false;
        this.form.patchValue({ amount: null });
        this.showForm = false;
        this.load();
      },
      error: () => {
        this.saving = false;
        refreshStewardshipView(this.cdr);
      },
    });
  }

  runDue(): void {
    this.running = true;
    refreshStewardshipView(this.cdr);
    this.donationsService.runDueRecurringSchedules().subscribe({
      next: () => {
        this.running = false;
        this.load();
      },
      error: () => {
        this.running = false;
        refreshStewardshipView(this.cdr);
      },
    });
  }

  pause(id: string): void {
    this.donationsService.pauseRecurringSchedule(id).subscribe({ next: () => this.load() });
  }

  cancel(id: string): void {
    this.donationsService.cancelRecurringSchedule(id).subscribe({ next: () => this.load() });
  }
}
