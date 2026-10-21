/**
 * Subscription access settings: grace/warning windows and renewal duration options.
 * The plan catalog lives in features/subscriptions (database-driven plans and versions).
 */

import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '@core/services/tenant.service';
import { ToastService } from '@core/services/toast.service';
import { ActionBarComponent, ActionBarItem } from '@shared/components/action-bar/action-bar.component';
import { CfEmptyStateComponent } from '@shared/components/cf-empty-state/cf-empty-state.component';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { TabStripComponent, TabStripItem } from '@shared/components/tab-strip/tab-strip.component';
import { of, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { NgSelectModule } from '@ng-select/ng-select';
import { Tenant } from '@core/models/tenant.model';
import { apiErrorMessage } from '@core/errors/api-error';
import { TenantSubscriptionAccessPolicyEditorComponent } from './tenant-subscription-access-policy-editor.component';

interface DurationOption {
  id?: number;
  months: number;
  label: string;
  display_order: number;
  active: boolean;
}

type SubMgmtTab = 'settings' | 'duration' | 'churches';

@Component({
  selector: 'app-subscription-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabStripComponent,
    LoadingSkeletonComponent,
    StatusBadgeComponent,
    CfEmptyStateComponent,
    DataTableComponent,
    ActionBarComponent,
    ModalShellComponent,
    NgSelectModule,
    TenantSubscriptionAccessPolicyEditorComponent,
  ],
  templateUrl: './subscription-management.component.html',
  styleUrls: ['./subscription-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionManagementComponent implements OnInit, OnDestroy {
  private tenantService = inject(TenantService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  activeTab: SubMgmtTab = 'settings';

  settingsForm = {
    grace_period_days: 7,
    expiring_warning_days: 14,
    view_only_allowance_days: 90,
  };
  settingsLoading = false;
  settingsSaving = false;
  settingsError: string | null = null;
  settingsLoaded = false;

  durationOptions: DurationOption[] = [];
  durationsLoading = false;
  durationsError: string | null = null;

  /** True while a modal create/update/delete request is in flight */
  saving = false;

  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;

  formData: DurationOption = {
    months: 1,
    label: '',
    display_order: 0,
    active: true
  };

  editingOption: DurationOption | null = null;
  deletingOption: DurationOption | null = null;

  churchTenantId: number | null = null;
  churchTenantIdInput = '';
  churchSearchOptions: Tenant[] = [];
  churchSearchLoading = false;
  selectedChurch: Tenant | null = null;
  readonly churchSearch$ = new Subject<string>();

  readonly tabs: { id: SubMgmtTab; label: string }[] = [
    { id: 'settings', label: 'Access settings' },
    { id: 'churches', label: 'Church overrides' },
    { id: 'duration', label: 'Duration options' },
  ];

  get tabStripItems(): TabStripItem[] {
    return this.tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      domId: `sub-mgmt-tab-${tab.id}`,
      ariaControls: `sub-mgmt-panel-${tab.id}`,
    }));
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadDurationOptions();

    this.churchSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = term.trim();
          if (q.length < 2) {
            return of({ success: true, data: [] as Tenant[] });
          }
          this.churchSearchLoading = true;
          this.cdr.markForCheck();
          return this.tenantService.listTenants({ search: q, per_page: 15, page: 1 });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.churchSearchOptions = response?.success && response.data ? response.data : [];
          this.churchSearchLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.churchSearchOptions = [];
          this.churchSearchLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: SubMgmtTab): void {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  onTabChange(tabId: string): void {
    if (tabId === 'settings' || tabId === 'duration' || tabId === 'churches') {
      this.setActiveTab(tabId);
    }
  }

  onChurchSelected(tenant: Tenant | null): void {
    this.selectedChurch = tenant;
    if (tenant?.id) {
      this.churchTenantId = tenant.id;
      this.churchTenantIdInput = String(tenant.id);
      this.cdr.markForCheck();
    }
  }

  loadChurchPolicy(): void {
    if (this.selectedChurch?.id) {
      this.churchTenantId = this.selectedChurch.id;
      this.cdr.markForCheck();
      return;
    }
    const id = parseInt(this.churchTenantIdInput.trim(), 10);
    if (!id || id < 1) {
      this.toastService.error('Search for a church or enter a valid tenant ID', 'Invalid selection');
      return;
    }
    this.churchTenantId = id;
    this.cdr.markForCheck();
  }

  durationRowActions(): ActionBarItem[] {
    return [
      { id: 'edit', label: 'Edit', tier: 'secondary', disabled: this.saving },
      { id: 'delete', label: 'Delete', tier: 'danger', disabled: this.saving },
    ];
  }

  onDurationRowAction(actionId: string, option: DurationOption): void {
    if (actionId === 'edit') {
      this.openEditModal(option);
      return;
    }
    if (actionId === 'delete') {
      this.openDeleteModal(option);
    }
  }

  loadSettings(): void {
    this.settingsLoading = true;
    this.settingsError = null;
    this.cdr.markForCheck();

    this.tenantService.getSubscriptionSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.settingsForm = {
              grace_period_days: response.data.grace_period_days,
              expiring_warning_days: response.data.expiring_warning_days,
              view_only_allowance_days: response.data.view_only_allowance_days ?? 90,
            };
            this.settingsLoaded = true;
          } else {
            this.settingsError = this.friendlyError(response.message, 'Unable to load access settings.');
          }
          this.settingsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.settingsError = this.friendlyError(this.extractErrorMessage(err), 'Unable to load access settings.');
          this.settingsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  saveSettings(): void {
    if (
      this.settingsForm.grace_period_days < 0 ||
      this.settingsForm.expiring_warning_days < 0 ||
      this.settingsForm.view_only_allowance_days < 0
    ) {
      this.toastService.error('Days cannot be negative', 'Check your entries');
      return;
    }
    this.settingsSaving = true;
    this.cdr.markForCheck();

    this.tenantService.updateSubscriptionSettings(this.settingsForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.settingsForm = {
              grace_period_days: response.data.grace_period_days,
              expiring_warning_days: response.data.expiring_warning_days,
              view_only_allowance_days: response.data.view_only_allowance_days ?? 90,
            };
            this.toastService.success('Access settings saved', 'Saved');
          } else {
            this.toastService.error(this.friendlyError(response.message, 'Unable to save access settings.'), 'Error');
          }
          this.settingsSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toastService.error(this.friendlyError(this.extractErrorMessage(err), 'Unable to save access settings.'), 'Error');
          this.settingsSaving = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadDurationOptions(): void {
    this.durationsLoading = true;
    this.durationsError = null;
    this.cdr.markForCheck();

    this.tenantService.getDurationOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            this.durationOptions = response.data;
          } else {
            this.durationsError = this.friendlyError(response.message, 'Unable to load duration options.');
          }
          this.durationsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.durationsError = this.friendlyError(this.extractErrorMessage(err), 'Unable to load duration options.');
          this.durationsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  openAddModal(): void {
    this.formData = {
      months: 1,
      label: '',
      display_order: this.durationOptions.length > 0
        ? Math.max(...this.durationOptions.map(o => o.display_order)) + 1
        : 0,
      active: true
    };
    this.showAddModal = true;
    this.cdr.markForCheck();
  }

  closeAddModal(): void {
    if (this.saving) {
      return;
    }
    this.showAddModal = false;
    this.resetDurationForm();
    this.cdr.markForCheck();
  }

  openEditModal(option: DurationOption): void {
    this.editingOption = option;
    this.formData = { ...option };
    this.showEditModal = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    if (this.saving) {
      return;
    }
    this.showEditModal = false;
    this.editingOption = null;
    this.resetDurationForm();
    this.cdr.markForCheck();
  }

  openDeleteModal(option: DurationOption): void {
    this.deletingOption = option;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    if (this.saving) {
      return;
    }
    this.showDeleteModal = false;
    this.deletingOption = null;
    this.cdr.markForCheck();
  }

  createDurationOption(): void {
    if (!this.validateDurationForm() || this.saving) {
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    this.tenantService.createDurationOption(this.formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Duration option created', 'Saved');
            this.saving = false;
            this.closeAddModal();
            this.loadDurationOptions();
          } else {
            this.toastService.error(this.friendlyError(response.message, 'Unable to create duration option.'), 'Error');
            this.saving = false;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toastService.error(this.friendlyError(this.extractErrorMessage(err), 'Unable to create duration option.'), 'Error');
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
  }

  updateDurationOption(): void {
    if (!this.editingOption || !this.validateDurationForm() || this.saving) {
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    this.tenantService.updateDurationOption(this.editingOption.id!, this.formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Duration option updated', 'Saved');
            this.saving = false;
            this.closeEditModal();
            this.loadDurationOptions();
          } else {
            this.toastService.error(this.friendlyError(response.message, 'Unable to update duration option.'), 'Error');
            this.saving = false;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toastService.error(this.friendlyError(this.extractErrorMessage(err), 'Unable to update duration option.'), 'Error');
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
  }

  deleteDurationOption(): void {
    if (!this.deletingOption || this.saving) {
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    this.tenantService.deleteDurationOption(this.deletingOption.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Duration option deleted', 'Deleted');
            this.saving = false;
            this.closeDeleteModal();
            this.loadDurationOptions();
          } else {
            this.toastService.error(this.friendlyError(response.message, 'Unable to delete duration option.'), 'Error');
            this.saving = false;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toastService.error(this.friendlyError(this.extractErrorMessage(err), 'Unable to delete duration option.'), 'Error');
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
  }

  validateDurationForm(): boolean {
    if (!this.formData.months || this.formData.months < 1) {
      this.toastService.error('Months must be at least 1', 'Check your entries');
      return false;
    }

    if (!this.formData.label || this.formData.label.trim().length === 0) {
      this.toastService.error('Label is required', 'Check your entries');
      return false;
    }

    const existingOption = this.durationOptions.find(
      opt => opt.months === this.formData.months &&
      (!this.editingOption || opt.id !== this.editingOption.id)
    );

    if (existingOption) {
      this.toastService.error('A duration option with this number of months already exists', 'Check your entries');
      return false;
    }

    return true;
  }

  private resetDurationForm(): void {
    this.formData = {
      months: 1,
      label: '',
      display_order: 0,
      active: true
    };
  }

  private extractErrorMessage(err: unknown): string | null {
    const message = apiErrorMessage(err);
    return message || null;
  }

  private friendlyError(message: string | null | undefined, fallback: string): string {
    if (message === '') {
      return '';
    }
    if (message && !/exception|stack|sqlstate|\bSQL\b|internal server/i.test(message)) {
      return message;
    }
    return fallback;
  }
}
