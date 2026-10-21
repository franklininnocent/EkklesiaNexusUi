import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@core/errors/api-error';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap } from '@angular/router';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { ToastService } from '@core/services/toast.service';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { IfFeatureDirective } from '@shared/directives/if-feature.directive';
import {
  AdvancedSearchPanelComponent,
  SearchField,
} from '@shared/components/advanced-search-panel/advanced-search-panel.component';
import { catchError, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { DonationDashboardSnapshot } from '../models/donation.model';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { ListToolbarComponent } from '@shared/components/list-toolbar/list-toolbar.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  StewardshipActiveFilterChipsComponent,
  StewardshipFilterChip,
} from '../components/stewardship-active-filter-chips/stewardship-active-filter-chips.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { StatusBadgeComponent, StatusBadgeTone } from '@shared/components/status-badge/status-badge.component';
import { DonationsService } from '../services/donations.service';
import { QuickCollectService } from '../services/quick-collect.service';
import { ContributionDue } from '../models/donation.model';
import { refreshStewardshipView, setupStewardshipRouteReload } from '../utils/stewardship-view.util';
import {
  DueScheduleFilter,
  dueScheduleFilterLabel,
  isDueScheduleFilter,
} from '../utils/due-schedule-filter.util';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { CfActionIconComponent } from '@shared/components/cf-action-icon/cf-action-icon.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { SortableDirective, SortDirection, SortEvent } from '@shared/directives/sortable.directive';

type DuesFilterChipKey = 'search' | 'schedule' | 'overdue' | 'status' | 'plan';

type DueSortColumn =
  | 'family_name'
  | 'plan_name'
  | 'period_label'
  | 'due_date'
  | 'outstanding'
  | 'status';

const DUE_STATUS_FILTERS = ['pending', 'partially_paid', 'paid', 'waived', 'cancelled'] as const;
type DueStatusFilter = (typeof DUE_STATUS_FILTERS)[number];

function isDueStatusFilter(value: string | null | undefined): value is DueStatusFilter {
  return value != null && (DUE_STATUS_FILTERS as readonly string[]).includes(value);
}

@Component({
  selector: 'app-donations-dues',
  standalone: true,
  imports: [
    CfDatePipe,
    CommonModule,
    RouterModule,
    CfEmptyStateComponent,
    IfFeatureDirective,
    AdvancedSearchPanelComponent,
    CfCurrencyPipe,
    CfActionIconComponent,
    ListToolbarComponent,
    PageHeaderComponent,
    StewardshipActiveFilterChipsComponent,
    LoadingSkeletonComponent,
    DataTableComponent,
    StatusBadgeComponent,
    PaginationComponent,
    SortableDirective,
  ],
  templateUrl: './donations-dues.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./donations-dues.component.scss', '../styles/stewardship-dashboard-shared.scss'],
})
export class DonationsDuesComponent implements OnInit {
  private readonly actions = inject(ActionAuthorizationService);
  snapshot: DonationDashboardSnapshot | null = null;
  dues: ContributionDue[] = [];
  tableSearch = '';
  loading = false;
  overdueOnly = false;
  dueScheduleFilter: DueScheduleFilter | '' = '';
  statusFilter = '';
  message: string | null = null;
  error: string | null = null;
  canManage = false;
  canNotify = false;
  whatsAppQueueing = false;
  selectionActionBusy = false;
  selectedIds = new Set<string>();
  headlineFamilies = false;
  planIdFilter = '';
  planNameFilter = '';
  rosterMode = false;
  overdueFamilyCountFromApi: number | null = null;
  duesListTotal = 0;
  page = 1;
  perPage = 20;
  readonly perPageOptions = [10, 20, 50, 100];
  showFilters = false;
  searchFields: SearchField[] = [];
  sortColumn: DueSortColumn = 'due_date';
  sortDirection: SortDirection = 'asc';

  readonly scheduleOptions: ReadonlyArray<{ key: DueScheduleFilter | ''; label: string }> = [
    { key: '', label: 'All collectable' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'next_14_days', label: 'Next 14 days' },
    { key: 'later', label: 'Later' },
  ];

  constructor(
    private donationsService: DonationsService,
    private authService: AuthService,
    private quickCollectService: QuickCollectService,
    private toast: ToastService,
    private confirmationDialog: ConfirmationDialogService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.canManage = this.actions.allows('donations.manage');
    this.canNotify = this.authService.hasPermission('donations.notifications');
    this.applyRouteQueryParams(this.route.snapshot.queryParamMap, true);
    this.initSearchFields();
    this.loadSnapshot();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.applyRouteQueryParams(params, false));
    setupStewardshipRouteReload(this.router, this.destroyRef, '/donations/dues', () => this.loadDues());
    this.donationsService.ledgerMutated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  get dueScheduleFilterLabel(): string {
    return this.dueScheduleFilter ? dueScheduleFilterLabel(this.dueScheduleFilter) : '';
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.tableSearch.trim()) {
      count += 1;
    }
    if (this.dueScheduleFilter) {
      count += 1;
    }
    if (this.overdueOnly && this.dueScheduleFilter !== 'overdue') {
      count += 1;
    }
    if (this.statusFilter) {
      count += 1;
    }
    if (this.planIdFilter) {
      count += 1;
    }
    return count;
  }

  get activeFilterChips(): { key: DuesFilterChipKey; label: string }[] {
    const chips: { key: DuesFilterChipKey; label: string }[] = [];
    if (this.tableSearch.trim()) {
      chips.push({ key: 'search', label: `Search: ${this.tableSearch.trim()}` });
    }
    if (this.dueScheduleFilter) {
      chips.push({ key: 'schedule', label: `Due schedule: ${this.dueScheduleFilterLabel}` });
    }
    if (this.overdueOnly && this.dueScheduleFilter !== 'overdue') {
      chips.push({ key: 'overdue', label: 'Overdue only' });
    }
    if (this.statusFilter) {
      chips.push({ key: 'status', label: `Status: ${this.statusFilterLabel(this.statusFilter)}` });
    }
    if (this.planIdFilter) {
      chips.push({ key: 'plan', label: this.planNameFilter ? `Plan: ${this.planNameFilter}` : 'This plan' });
    }
    return chips;
  }

  onAdvancedSearch(values: { [key: string]: unknown }): void {
    const nextSchedule = isDueScheduleFilter(values['due_schedule'] as string)
      ? (values['due_schedule'] as DueScheduleFilter)
      : '';
    const nextStatus = isDueStatusFilter(values['status'] as string) ? values['status'] : '';
    const requestedOverdue = values['overdue_only'] === true || values['overdue_only'] === 'true';
    this.tableSearch = String(values['search'] ?? '').trim();
    this.showFilters = false;
    this.syncSearchFieldValues();
    this.pruneSelection();
    void this.router.navigate(['/donations/dues'], {
      queryParams: {
        due_schedule: nextSchedule || null,
        overdue_only: nextSchedule ? null : requestedOverdue ? true : null,
        status: nextStatus || null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  onClearAdvancedSearch(): void {
    this.tableSearch = '';
    this.showFilters = false;
    this.syncSearchFieldValues();
    this.pruneSelection();
    void this.router.navigate(['/donations/dues'], {
      queryParams: {
        due_schedule: null,
        overdue_only: null,
        status: null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  setDueSchedule(key: DueScheduleFilter | ''): void {
    void this.router.navigate(['/donations/dues'], {
      queryParams: {
        due_schedule: key || null,
        overdue_only: null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  clearDueScheduleFilter(): void {
    this.setDueSchedule('');
  }

  onActiveFilterChipRemove(chip: StewardshipFilterChip): void {
    const key = chip.key as DuesFilterChipKey | undefined;
    if (key) {
      this.removeFilterChip(key);
    }
  }

  removeFilterChip(key: DuesFilterChipKey): void {
    if (key === 'search') {
      this.tableSearch = '';
      this.syncSearchFieldValues();
      this.pruneSelection();
      return;
    }
    if (key === 'schedule') {
      this.clearDueScheduleFilter();
      return;
    }
    if (key === 'overdue') {
      void this.router.navigate(['/donations/dues'], {
        queryParams: { overdue_only: null, page: null },
        queryParamsHandling: 'merge',
      });
      return;
    }
    if (key === 'status') {
      void this.router.navigate(['/donations/dues'], {
        queryParams: { status: null, page: null },
        queryParamsHandling: 'merge',
      });
      return;
    }
    if (key === 'plan') {
      void this.router.navigate(['/donations/dues'], {
        queryParams: { plan_id: null, plan_name: null, roster: null, page: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  clearAllFilters(): void {
    this.tableSearch = '';
    this.selectedIds = new Set();
    void this.router.navigate(['/donations/dues'], {
      queryParams: {
        due_schedule: null,
        overdue_only: null,
        status: null,
        page: null,
        per_page: null,
        plan_id: null,
        plan_name: null,
        roster: null,
      },
    });
  }

  goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onPageSizeChange(size: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: null,
        per_page: size !== 20 ? size : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSort(event: SortEvent): void {
    const allowed: DueSortColumn[] = [
      'family_name',
      'plan_name',
      'period_label',
      'due_date',
      'outstanding',
      'status',
    ];
    if (!allowed.includes(event.column as DueSortColumn)) {
      return;
    }
    this.sortColumn = event.column as DueSortColumn;
    this.sortDirection = event.direction ?? 'asc';
    if (this.page > 1) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    this.loadDues();
  }

  reload(): void {
    this.loadSnapshot();
    this.loadDues();
  }

  familyCountLabel(count: number): string {
    return count === 1 ? '1 family' : `${count} families`;
  }

  openQuickCollect(): void {
    this.quickCollectService.open();
  }

  collectForFamily(familyId: string): void {
    this.quickCollectService.openForFamily(familyId);
  }

  collectForDue(due: ContributionDue): void {
    this.quickCollectService.open({
      familyId: due.family_id || undefined,
      dueId: due.id,
    });
  }

  collectSelected(): void {
    if (!this.canCollectSelected || this.selectionActionBusy) {
      if (this.selectedCount && !this.canCollectSelected) {
        this.toast.warning(
          'Collect Payment works for one family at a time. Select dues for a single family.',
          'Select one family'
        );
      }
      return;
    }
    const due = this.selectedDues.find((row) => !!row.family_id);
    if (!due) {
      return;
    }
    this.collectForDue(due);
  }

  get selectedDues(): ContributionDue[] {
    return this.filteredDues.filter((due) => this.selectedIds.has(due.id));
  }

  get selectedCount(): number {
    return this.selectedDues.length;
  }

  get allVisibleSelected(): boolean {
    return this.filteredDues.length > 0 && this.filteredDues.every((due) => this.selectedIds.has(due.id));
  }

  get someVisibleSelected(): boolean {
    return this.selectedCount > 0 && !this.allVisibleSelected;
  }

  get canCollectSelected(): boolean {
    if (!this.selectedCount) {
      return false;
    }
    const familyIds = [
      ...new Set(this.selectedDues.map((due) => due.family_id).filter((id): id is string => !!id)),
    ];
    return familyIds.length === 1;
  }

  get canWaiveSelected(): boolean {
    return this.canManage && this.selectedDues.some((due) => this.isWaivable(due));
  }

  get canWhatsAppSelected(): boolean {
    return this.canManage && this.selectedDues.some((due) => !!due.family_id);
  }

  get collectToolbarTitle(): string {
    if (!this.selectedCount) {
      return 'Select a family to collect';
    }
    if (!this.canCollectSelected) {
      return 'Select dues for one family to collect';
    }
    return 'Collect Payment';
  }

  isDueSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleDueSelection(id: string, checked: boolean): void {
    const next = new Set(this.selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedIds = next;
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.selectedIds = new Set(this.filteredDues.map((due) => due.id));
      return;
    }
    this.selectedIds = new Set();
  }

  get filteredDues(): ContributionDue[] {
    const query = this.tableSearch.trim().toLowerCase();
    if (!query) {
      return this.dues;
    }
    return this.dues.filter((due) => {
      const haystack = [
        due.family?.family_name,
        due.family?.family_code,
        due.plan?.name,
        due.period_label,
        due.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  get overdueFamilyIds(): string[] {
    return [
      ...new Set(
        this.dues.filter((due) => this.isDueOverdue(due) && due.family_id).map((due) => due.family_id)
      ),
    ];
  }

  get overdueCount(): number {
    return this.dues.filter((due) => this.isDueOverdue(due)).length;
  }

  get outstandingTotal(): number {
    return this.dues.reduce((sum, due) => sum + this.outstandingForDue(due), 0);
  }

  get showFamilyHeadline(): boolean {
    return (
      this.headlineFamilies && this.overdueOnly && !this.statusFilter && this.overdueFamilyCountFromApi !== null
    );
  }

  trackDue(_index: number, due: ContributionDue): string {
    return due.id;
  }

  familyName(due: ContributionDue): string {
    return due.family?.family_name || due.family_id || '—';
  }

  familyCode(due: ContributionDue): string | null {
    const code = due.family?.family_code?.trim();
    return code || null;
  }

  planName(due: ContributionDue): string {
    return due.plan?.name || due.plan_id || '—';
  }

  outstandingForDue(due: ContributionDue): number {
    const outstanding = due.outstanding_amount ?? due.amount_due - due.amount_paid;
    return Math.max(0, outstanding);
  }

  dueStatusLabel(due: ContributionDue): string {
    if (this.isDueOverdue(due)) {
      return 'Overdue';
    }
    return this.statusFilterLabel(due.status);
  }

  dueStatusTone(due: ContributionDue): StatusBadgeTone {
    if (this.isDueOverdue(due)) {
      return 'critical';
    }
    if (due.status === 'paid') {
      return 'success';
    }
    if (due.status === 'partially_paid' || due.status === 'pending') {
      return 'warning';
    }
    if (due.status === 'cancelled') {
      return 'neutral';
    }
    return 'info';
  }

  private statusFilterLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  isDueOverdue(due: ContributionDue): boolean {
    if (due.is_overdue !== undefined) {
      return !!due.is_overdue;
    }
    if (due.status === 'paid' || due.status === 'waived' || due.status === 'cancelled') {
      return false;
    }
    return due.schedule_state === 'overdue';
  }

  private loadSnapshot(): void {
    this.donationsService
      .getDashboardSummary()
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.snapshot = res?.data?.snapshot ?? null;
        refreshStewardshipView(this.cdr);
      });
  }

  loadDues(): void {
    this.loading = true;
    this.error = null;
    refreshStewardshipView(this.cdr);
    const filters: Record<string, string | boolean> = {
      page: String(this.page),
      per_page: String(this.perPage),
    };
    if (this.dueScheduleFilter) {
      filters['due_schedule'] = this.dueScheduleFilter;
    } else if (!this.rosterMode) {
      filters['actionable'] = true;
      if (this.overdueOnly) {
        filters['overdue_only'] = true;
      }
    }
    if (this.statusFilter) {
      filters['status'] = this.statusFilter;
    }
    if (this.planIdFilter) {
      filters['plan_id'] = this.planIdFilter;
    }
    filters['sort'] = this.sortColumn;
    filters['direction'] = this.sortDirection ?? 'asc';

    this.donationsService.getDues(filters).subscribe({
      next: (res) => {
        this.dues = res.data?.data || [];
        this.duesListTotal = res.data?.total ?? 0;
        this.page = res.data?.current_page ?? this.page;
        this.overdueFamilyCountFromApi = res.meta?.overdue_family_count ?? null;
        if (!this.overdueOnly || this.statusFilter) {
          this.overdueFamilyCountFromApi = null;
        }
        this.loading = false;
        this.pruneSelection();
        refreshStewardshipView(this.cdr);
      },
      error: (err) => {
        this.error = apiErrorMessage(err, 'Failed to load contribution dues.');
        this.loading = false;
        refreshStewardshipView(this.cdr);
      },
    });
  }

  queueBulkWhatsApp(): void {
    if (!this.canWhatsAppSelected || this.whatsAppQueueing) {
      return;
    }
    const ids = [
      ...new Set(this.selectedDues.filter((due) => !!due.family_id).map((due) => due.family_id)),
    ];
    if (!ids.length) {
      this.toast.warning('Select at least one family to send a WhatsApp reminder.', 'Nothing selected');
      return;
    }

    this.whatsAppQueueing = true;
    this.donationsService.queueWhatsAppOutreach(ids).subscribe({
      next: (res) => {
        this.whatsAppQueueing = false;
        this.toast.success(res.message || 'WhatsApp reminders queued.', 'Reminders');
        refreshStewardshipView(this.cdr);
      },
      error: (err) => {
        this.whatsAppQueueing = false;
        this.toast.error(apiErrorMessage(err, 'Unable to queue WhatsApp reminders right now.'), 'Could not remind');
        refreshStewardshipView(this.cdr);
      },
    });
  }

  generateScheduled(): void {
    this.donationsService.generateScheduledContributions().subscribe({
      next: (res) => {
        this.toast.success(
          `${res.message} Created ${res.data.generated} new due(s) across auto-generate plans.`,
          'Plans updated'
        );
        this.loadDues();
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Scheduled generation failed.'), 'Could not catch up plans');
      },
    });
  }

  waiveSelected(): void {
    if (!this.canWaiveSelected || this.selectionActionBusy) {
      return;
    }
    const ids = this.selectedDues.filter((due) => this.isWaivable(due)).map((due) => due.id);
    if (!ids.length) {
      return;
    }
    const countLabel = ids.length === 1 ? '1 contribution due' : `${ids.length} contribution dues`;
    this.confirmationDialog
      .confirm({
        title: 'Waive selected dues',
        message: `Waive ${countLabel}? Families will no longer be asked to pay these amounts.`,
        confirmText: 'Waive',
        variant: 'danger',
      })
      .pipe(filter((result) => result.confirmed))
      .subscribe(() => {
        this.selectionActionBusy = true;
        this.donationsService.bulkWaiveDues(ids).subscribe({
          next: (res) => {
            this.selectionActionBusy = false;
            this.applyBulkResultToast(res.message, res.data.skipped_count);
            this.selectedIds = new Set();
            this.loadDues();
          },
          error: (err) => {
            this.selectionActionBusy = false;
            this.toast.error(apiErrorMessage(err, 'Failed to waive dues.'), 'Could not waive');
            refreshStewardshipView(this.cdr);
          },
        });
      });
  }

  remindSelected(): void {
    if (!this.canNotify || !this.selectedCount || this.selectionActionBusy) {
      return;
    }
    const ids = this.selectedDues.map((due) => due.id);
    this.selectionActionBusy = true;
    this.donationsService.bulkRemindDues(ids).subscribe({
      next: (res) => {
        this.selectionActionBusy = false;
        this.applyBulkResultToast(res.message, res.data.skipped_count);
        refreshStewardshipView(this.cdr);
      },
      error: (err) => {
        this.selectionActionBusy = false;
        this.toast.error(apiErrorMessage(err, 'Failed to queue reminders.'), 'Could not remind');
        refreshStewardshipView(this.cdr);
      },
    });
  }

  waive(due: ContributionDue): void {
    this.selectedIds = new Set([due.id]);
    this.waiveSelected();
  }

  remind(due: ContributionDue): void {
    this.selectedIds = new Set([due.id]);
    this.remindSelected();
  }

  cancel(due: ContributionDue): void {
    this.donationsService.cancelDue(due.id).subscribe({
      next: (res) => {
        this.toast.success(res.message, 'Cancelled');
        this.loadDues();
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Failed to cancel due.'), 'Could not cancel');
      },
    });
  }

  private isWaivable(due: ContributionDue): boolean {
    return due.status === 'pending' || due.status === 'partially_paid';
  }

  private applyBulkResultToast(message: string, skippedCount: number): void {
    if (skippedCount > 0) {
      this.toast.warning(message, 'Some records were skipped');
      return;
    }
    this.toast.success(message, 'Done');
  }

  private pruneSelection(): void {
    const visible = new Set(this.filteredDues.map((due) => due.id));
    this.selectedIds = new Set([...this.selectedIds].filter((id) => visible.has(id)));
  }

  private applyRouteQueryParams(params: ParamMap, initial: boolean): void {
    const schedule = isDueScheduleFilter(params.get('due_schedule'))
      ? (params.get('due_schedule') as DueScheduleFilter)
      : '';
    const overdueParam = params.get('overdue_only');
    const headline = params.get('headline') === 'families';

    let changed = false;
    if (this.dueScheduleFilter !== schedule) {
      this.dueScheduleFilter = schedule;
      changed = true;
    }
    if (this.headlineFamilies !== headline) {
      this.headlineFamilies = headline;
    }

    const overdueFromUrl = overdueParam === '1' || overdueParam === 'true';
    const overdueTarget = schedule === 'overdue' ? true : schedule ? false : overdueFromUrl;
    if (this.overdueOnly !== overdueTarget) {
      this.overdueOnly = overdueTarget;
      changed = true;
    }

    const statusParam = params.get('status');
    const status = isDueStatusFilter(statusParam) ? statusParam : '';
    if (this.statusFilter !== status) {
      this.statusFilter = status;
      changed = true;
    }

    const planId = params.get('plan_id') ?? '';
    const planName = params.get('plan_name') ?? '';
    const roster = params.get('roster') === '1' || params.get('roster') === 'true';
    if (this.planIdFilter !== planId) {
      this.planIdFilter = planId;
      changed = true;
    }
    if (this.planNameFilter !== planName) {
      this.planNameFilter = planName;
      changed = true;
    }
    if (this.rosterMode !== roster) {
      this.rosterMode = roster;
      changed = true;
    }

    const nextPage = Math.max(1, Number(params.get('page') || 1) || 1);
    const rawPerPage = Number(params.get('per_page') || 20) || 20;
    const nextPerPage = this.perPageOptions.includes(rawPerPage) ? rawPerPage : 20;
    if (this.page !== nextPage) {
      this.page = nextPage;
      changed = true;
    }
    if (this.perPage !== nextPerPage) {
      this.perPage = nextPerPage;
      changed = true;
    }

    this.syncSearchFieldValues();

    if (changed || initial) {
      this.loadDues();
    }
  }

  private initSearchFields(): void {
    this.searchFields = [
      {
        key: 'search',
        label: 'Family or plan',
        type: 'text',
        placeholder: 'Filter families or plans…',
        value: this.tableSearch.trim() || undefined,
      },
      {
        key: 'due_schedule',
        label: 'Due schedule',
        type: 'select',
        options: this.scheduleOptions.map((option) => ({ value: option.key, label: option.label })),
        value: this.dueScheduleFilter || undefined,
      },
      {
        key: 'overdue_only',
        label: 'Overdue only',
        type: 'boolean',
        placeholder: 'Show overdue items only',
        value: this.overdueOnly && this.dueScheduleFilter !== 'overdue' ? true : undefined,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'partially_paid', label: 'Partially paid' },
          { value: 'paid', label: 'Paid' },
          { value: 'waived', label: 'Waived' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        value: this.statusFilter || undefined,
      },
    ];
  }

  private syncSearchFieldValues(): void {
    if (!this.searchFields.length) {
      return;
    }
    const searchField = this.searchFields.find((field) => field.key === 'search');
    const scheduleField = this.searchFields.find((field) => field.key === 'due_schedule');
    const overdueField = this.searchFields.find((field) => field.key === 'overdue_only');
    const statusField = this.searchFields.find((field) => field.key === 'status');
    if (searchField) {
      searchField.value = this.tableSearch.trim() || undefined;
    }
    if (scheduleField) {
      scheduleField.value = this.dueScheduleFilter || undefined;
    }
    if (overdueField) {
      overdueField.value = this.overdueOnly && this.dueScheduleFilter !== 'overdue' ? true : undefined;
    }
    if (statusField) {
      statusField.value = this.statusFilter || undefined;
    }
  }
}
