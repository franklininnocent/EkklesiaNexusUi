import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, EMPTY } from 'rxjs';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { ToastService } from '@core/services/toast.service';
import { ChurchCurrencyService } from '@core/services/church-currency.service';
import { EntitlementService } from '@core/services/entitlement.service';
import { DonationsDuesComponent } from './donations-dues.component';
import { DonationsService } from '../services/donations.service';
import { QuickCollectService } from '../services/quick-collect.service';

describe('DonationsDuesComponent', () => {
  let fixture: ComponentFixture<DonationsDuesComponent>;
  let component: DonationsDuesComponent;
  let getDues: jest.Mock;
  let bulkRemindDues: jest.Mock;
  let bulkWaiveDues: jest.Mock;
  let queueWhatsAppOutreach: jest.Mock;
  let router: Router;
  let quickCollect: { open: jest.Mock; openForFamily: jest.Mock };

  const dueA = {
    id: 'due-1',
    family_id: 'fam-1',
    plan_id: 'plan-1',
    period_label: 'Oct 2026',
    due_date: '2026-10-10',
    amount_due: 250,
    amount_paid: 0,
    outstanding_amount: 250,
    status: 'pending',
    family: { id: 'fam-1', family_name: 'Family A', family_code: 'FAM001' },
    plan: { id: 'plan-1', name: 'Monthly Tithe', code: 'TITHE' },
  };
  const dueB = {
    id: 'due-2',
    family_id: 'fam-2',
    plan_id: 'plan-1',
    period_label: 'Oct 2026',
    due_date: '2026-10-12',
    amount_due: 100,
    amount_paid: 0,
    outstanding_amount: 100,
    status: 'pending',
    family: { id: 'fam-2', family_name: 'Family B', family_code: 'FAM002' },
    plan: { id: 'plan-1', name: 'Monthly Tithe', code: 'TITHE' },
  };

  const duesResponse = {
    success: true,
    data: { data: [dueA, dueB], total: 2, current_page: 1, last_page: 1, per_page: 20 },
    meta: { overdue_family_count: 0 },
  };

  beforeEach(async () => {
    getDues = jest.fn().mockReturnValue(of(duesResponse));
    bulkRemindDues = jest.fn().mockReturnValue(of({ success: true, message: '2 dues reminded.', data: { processed_count: 2, skipped_count: 0, processed_ids: ['due-1', 'due-2'], skipped: [] } }));
    bulkWaiveDues = jest.fn().mockReturnValue(of({ success: true, message: '1 due waived.', data: { processed_count: 1, skipped_count: 0, processed_ids: ['due-1'], skipped: [] } }));
    queueWhatsAppOutreach = jest.fn().mockReturnValue(of({ success: true, message: '1 WhatsApp outreach reminders queued.' }));
    quickCollect = { open: jest.fn(), openForFamily: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DonationsDuesComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ due_schedule: 'next_14_days' }) },
            queryParamMap: of(convertToParamMap({ due_schedule: 'next_14_days' })),
          },
        },
        {
          provide: DonationsService,
          useValue: {
            getDues,
            getDashboardSummary: jest.fn().mockReturnValue(
              of({
                success: true,
                data: {
                  snapshot: {
                    outstanding_contributions: 1000,
                    overdue_amount: 200,
                    overdue_families: 2,
                  },
                },
              })
            ),
            queueWhatsAppOutreach,
            generateScheduledContributions: jest.fn(),
            waiveDue: jest.fn(),
            cancelDue: jest.fn(),
            remindDue: jest.fn(),
            bulkWaiveDues,
            bulkRemindDues,
            ledgerMutated$: EMPTY,
          },
        },
        { provide: QuickCollectService, useValue: quickCollect },
        { provide: AuthService, useValue: { hasPermission: jest.fn(() => true) } },
        { provide: ActionAuthorizationService, useValue: { allows: () => true } },
        { provide: ToastService, useValue: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } },
        { provide: ConfirmationDialogService, useValue: { confirm: jest.fn(() => of({ confirmed: true })) } },
        { provide: ChurchCurrencyService, useValue: { currencyCode: () => 'USD' } },
        {
          provide: EntitlementService,
          useValue: {
            entitlements: signal(null),
            load: () => of(null),
            hasAllFeatures: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsDuesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('uses dashboard-style header actions and the shared filter drawer', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-advanced-search-panel')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Filters"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Collect Payment"]')).toBeTruthy();
    expect(el.querySelector('.cf-kpi-strip')).toBeTruthy();
    expect(el.querySelector('.dues-schedule-nav')).toBeNull();
    expect(el.querySelector('.dues-filters')).toBeNull();
    expect(el.querySelectorAll('.cf-page-header__actions .cf-btn-icon').length).toBeGreaterThanOrEqual(2);
  });

  it('loads dues from the due_schedule query param and shows an active filter chip', () => {
    expect(getDues).toHaveBeenCalledWith(
      expect.objectContaining({
        due_schedule: 'next_14_days',
        page: '1',
        per_page: '20',
        sort: 'due_date',
        direction: 'asc',
      })
    );
    expect(component.activeFilterCount).toBe(1);
    expect(component.activeFilterChips.map((chip) => chip.label)).toEqual(['Due schedule: Next 14 days']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Due schedule: Next 14 days');
  });

  it('opens the standard side panel from the toolbar filter icon', () => {
    const filterButton = (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Filters"]'
    ) as HTMLButtonElement;
    filterButton.click();
    fixture.detectChanges();
    expect(component.showFilters).toBe(true);
    expect(component.searchFields.map((field) => field.key)).toEqual([
      'search',
      'due_schedule',
      'overdue_only',
      'status',
    ]);
  });

  it('applies drawer filters through the dues query params', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onAdvancedSearch({
      search: 'Varghese',
      due_schedule: 'overdue',
      status: 'pending',
      overdue_only: true,
    });
    expect(component.tableSearch).toBe('Varghese');
    expect(component.showFilters).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/donations/dues'],
      expect.objectContaining({
        queryParams: {
          due_schedule: 'overdue',
          overdue_only: null,
          status: 'pending',
          page: null,
        },
        queryParamsHandling: 'merge',
      })
    );
  });

  it('clears drawer filters from the shared panel reset action', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component.tableSearch = 'Varghese';
    component.onClearAdvancedSearch();
    expect(component.tableSearch).toBe('');
    expect(component.showFilters).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/donations/dues'],
      expect.objectContaining({
        queryParams: {
          due_schedule: null,
          overdue_only: null,
          status: null,
          page: null,
        },
        queryParamsHandling: 'merge',
      })
    );
  });

  it('sends sort params when a column header is sorted', () => {
    getDues.mockClear();
    component.onSort({ column: 'family_name', direction: 'desc' });
    expect(component.sortColumn).toBe('family_name');
    expect(component.sortDirection).toBe('desc');
    expect(getDues).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'family_name', direction: 'desc' })
    );
  });

  it('opens Collect Payment with the due and family from the selected row', () => {
    component.collectForDue({
      id: 'due-1',
      family_id: 'fam-1',
      amount_due: 250,
      amount_paid: 0,
    } as any);
    expect(quickCollect.open).toHaveBeenCalledWith({
      familyId: 'fam-1',
      dueId: 'due-1',
    });
  });

  it('uses table checkboxes and a disabled common toolbar until rows are selected', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.cf-row-actions')).toBeNull();
    expect(el.querySelectorAll('tbody input[type="checkbox"]').length).toBe(2);
    const collect = el.querySelector('button[aria-label="Collect Payment"]') as HTMLButtonElement;
    const remind = el.querySelector('button[aria-label="Send reminder"]') as HTMLButtonElement;
    const waive = el.querySelector('button[aria-label="Waive selected dues"]') as HTMLButtonElement;
    expect(collect.disabled).toBe(true);
    expect(remind.disabled).toBe(true);
    expect(waive.disabled).toBe(true);
    expect(el.textContent).not.toContain('selected');
  });

  it('selects all visible dues and enables bulk actions with an accurate count', () => {
    const el = fixture.nativeElement as HTMLElement;
    const headerCheckbox = el.querySelector('thead input[type="checkbox"]') as HTMLInputElement;
    headerCheckbox.dispatchEvent(new Event('change'));
    component.toggleSelectAll(true);
    fixture.detectChanges();

    expect(component.selectedCount).toBe(2);
    expect(el.textContent).toContain('2 selected');
    const remind = el.querySelector('button[aria-label="Send reminder"]') as HTMLButtonElement;
    const waive = el.querySelector('button[aria-label="Waive selected dues"]') as HTMLButtonElement;
    expect(remind.disabled).toBe(false);
    expect(waive.disabled).toBe(false);
    expect((el.querySelector('button[aria-label="Collect Payment"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('collects the selected family and reminds every selected due', () => {
    component.toggleDueSelection('due-1', true);
    fixture.detectChanges();
    component.collectSelected();
    expect(quickCollect.open).toHaveBeenCalledWith({ familyId: 'fam-1', dueId: 'due-1' });

    component.toggleDueSelection('due-2', true);
    component.remindSelected();
    expect(bulkRemindDues).toHaveBeenCalledWith(['due-1', 'due-2']);
  });

  it('clears the selected count when rows are deselected', () => {
    component.toggleSelectAll(true);
    expect(component.selectedCount).toBe(2);
    component.toggleDueSelection('due-1', false);
    expect(component.selectedCount).toBe(1);
    component.toggleSelectAll(false);
    expect(component.selectedCount).toBe(0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('selected');
  });
});
