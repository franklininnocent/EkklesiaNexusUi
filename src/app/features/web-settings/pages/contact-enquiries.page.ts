import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ListToolbarComponent } from '@shared/components/list-toolbar/list-toolbar.component';
import {
  AdvancedSearchPanelComponent,
  SearchField,
} from '@shared/components/advanced-search-panel/advanced-search-panel.component';
import { DataTableComponent, trackByEntityId } from '@shared/components/data-table/data-table.component';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { ConfirmationModalComponent, ConfirmationResult } from '@shared/components/confirmation-modal/confirmation-modal.component';
import { StatusBadgeComponent, StatusBadgeTone } from '@shared/components/status-badge/status-badge.component';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';
import { WebSettingsApiService } from '../services/web-settings.service';
import { ContactEnquiryRow } from '../models/web-settings.models';

@Component({
  selector: 'app-contact-enquiries-page',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    ListToolbarComponent,
    AdvancedSearchPanelComponent,
    DataTableComponent,
    CfEmptyStateComponent,
    LoadingSkeletonComponent,
    ConfirmationModalComponent,
    StatusBadgeComponent,
    ModalShellComponent,
    CfDatePipe,
  ],
  templateUrl: './contact-enquiries.page.html',
  styleUrl: './contact-enquiries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactEnquiriesPage implements OnInit, OnDestroy {
  private readonly api = inject(WebSettingsApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly trackById = trackByEntityId;
  readonly canView = this.auth.canViewContactEnquiries();
  readonly canUpdate = this.auth.canUpdateContactEnquiries();
  readonly canRetry = this.auth.canRetryContactEnquiryEmail();
  readonly canDelete = this.auth.canDeleteContactEnquiries();

  search = '';
  enquiryStatus = '';
  deliveryStatus = '';
  submittedFrom = '';
  submittedTo = '';
  sort = 'created_at';
  direction: 'asc' | 'desc' = 'desc';
  page = 1;
  perPage = 20;
  total = 0;
  lastPage = 1;
  showFilters = false;
  searchFields: SearchField[] = [];

  rows: ContactEnquiryRow[] = [];
  loading = false;
  loaded = false;
  processing = false;
  error: string | null = null;
  success: string | null = null;
  detailOpen = false;
  selected: ContactEnquiryRow | null = null;
  confirmOpen = false;
  pendingDelete: ContactEnquiryRow | null = null;

  ngOnInit(): void {
    this.searchFields = [
      {
        key: 'enquiry_status',
        label: 'Enquiry status',
        type: 'select',
        options: [
          { value: 'unread', label: 'Unread' },
          { value: 'read', label: 'Read' },
          { value: 'in_progress', label: 'In progress' },
          { value: 'closed', label: 'Closed' },
          { value: 'archived', label: 'Archived' },
        ],
      },
      {
        key: 'delivery_status',
        label: 'Email delivery',
        type: 'select',
        options: [
          { value: 'received', label: 'Received' },
          { value: 'queued', label: 'Queued' },
          { value: 'sent', label: 'Sent by transport' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      { key: 'submitted_from', label: 'From date', type: 'date' },
      { key: 'submitted_to', label: 'To date', type: 'date' },
    ];
    if (this.canView) {
      this.reload();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasActiveFilters(): boolean {
    return !!(this.search.trim() || this.enquiryStatus || this.deliveryStatus || this.submittedFrom || this.submittedTo);
  }

  get drawerFilterCount(): number {
    return [this.enquiryStatus, this.deliveryStatus, this.submittedFrom, this.submittedTo].filter(Boolean).length;
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.page = 1;
    this.reload();
  }

  onAdvancedSearch(values: Record<string, unknown>): void {
    this.enquiryStatus = String(values['enquiry_status'] ?? '');
    this.deliveryStatus = String(values['delivery_status'] ?? '');
    this.submittedFrom = String(values['submitted_from'] ?? '');
    this.submittedTo = String(values['submitted_to'] ?? '');
    this.showFilters = false;
    this.page = 1;
    this.reload();
  }

  onClearAdvancedSearch(): void {
    this.enquiryStatus = '';
    this.deliveryStatus = '';
    this.submittedFrom = '';
    this.submittedTo = '';
    this.showFilters = false;
    this.page = 1;
    this.reload();
  }

  sortBy(column: string): void {
    if (this.sort === column) {
      this.direction = this.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = column;
      this.direction = column === 'created_at' ? 'desc' : 'asc';
    }
    this.reload();
  }

  reload(): void {
    if (!this.canView) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.api
      .listEnquiries({
        search: this.search.trim() || undefined,
        enquiry_status: this.enquiryStatus || undefined,
        delivery_status: this.deliveryStatus || undefined,
        submitted_from: this.submittedFrom || undefined,
        submitted_to: this.submittedTo || undefined,
        sort: this.sort,
        direction: this.direction,
        page: this.page,
        per_page: this.perPage,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.loaded = true;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ rows, meta }) => {
          this.rows = rows;
          this.page = meta.current_page;
          this.perPage = meta.per_page;
          this.total = meta.total;
          this.lastPage = meta.last_page;
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.error?.message ?? 'Unable to load contact enquiries.';
        },
      });
  }

  openDetail(row: ContactEnquiryRow): void {
    this.detailOpen = true;
    this.selected = row;
    this.api.getEnquiry(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (detail) => {
        this.selected = detail;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.error?.message ?? 'Unable to load enquiry details.';
        this.cdr.markForCheck();
      },
    });
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selected = null;
  }

  setStatus(row: ContactEnquiryRow, enquiry_status: string): void {
    this.mutate(() => this.api.updateEnquiry(row.id, { enquiry_status }), 'Status updated.');
  }

  markRead(row: ContactEnquiryRow, is_read: boolean): void {
    this.mutate(() => this.api.updateEnquiry(row.id, { is_read }), is_read ? 'Marked as read.' : 'Marked as unread.');
  }

  retry(row: ContactEnquiryRow): void {
    if (!this.canRetry || !row.can_retry_email) {
      return;
    }
    this.mutate(() => this.api.retryEmail(row.id), 'Email delivery has been queued again.');
  }

  requestDelete(row: ContactEnquiryRow): void {
    this.pendingDelete = row;
    this.confirmOpen = true;
  }

  onConfirmDelete(result: ConfirmationResult): void {
    const row = this.pendingDelete;
    this.confirmOpen = false;
    this.pendingDelete = null;
    if (!result.confirmed || !row || !this.canDelete) {
      return;
    }
    this.processing = true;
    this.api
      .deleteEnquiry(row.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.success = 'Enquiry deleted.';
          this.closeDetail();
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.error?.message ?? 'Unable to delete enquiry.';
        },
      });
  }

  statusLabel(value: string): string {
    return value.replace(/_/g, ' ');
  }

  enquiryTone(status: string): StatusBadgeTone {
    if (status === 'unread') return 'warning';
    if (status === 'closed' || status === 'archived') return 'neutral';
    return 'info';
  }

  deliveryTone(status: string): StatusBadgeTone {
    if (status === 'sent') return 'success';
    if (status === 'failed') return 'critical';
    if (status === 'queued') return 'warning';
    return 'neutral';
  }

  changePage(delta: number): void {
    const next = this.page + delta;
    if (next < 1 || next > this.lastPage) {
      return;
    }
    this.page = next;
    this.reload();
  }

  private mutate(run: () => ReturnType<WebSettingsApiService['updateEnquiry']>, success: string): void {
    if (this.processing) {
      return;
    }
    this.processing = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
    run()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (updated) => {
          this.success = success;
          this.selected = this.selected?.id === updated.id ? updated : this.selected;
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.error?.message ?? 'Unable to update enquiry.';
        },
      });
  }
}
