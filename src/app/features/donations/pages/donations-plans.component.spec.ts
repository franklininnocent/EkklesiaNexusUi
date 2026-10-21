import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { ToastService } from '@core/services/toast.service';
import { ChurchCurrencyService } from '@core/services/church-currency.service';
import { FamilyService } from '@core/services/family.service';
import { DonationsPlansComponent } from './donations-plans.component';
import { DonationsService } from '../services/donations.service';

describe('DonationsPlansComponent — collection purpose create', () => {
  let fixture: ComponentFixture<DonationsPlansComponent>;
  let component: DonationsPlansComponent;
  let createFund: jest.Mock;
  let hasPermission: jest.Mock;

  const existingFund = { id: 'fund-1', name: 'Sunday Offering', code: 'SUN' };

  beforeEach(async () => {
    createFund = jest.fn();
    hasPermission = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [DonationsPlansComponent],
      providers: [
        provideRouter([]),
        {
          provide: DonationsService,
          useValue: {
            getPlans: jest.fn().mockReturnValue(of({ success: true, data: [] })),
            getFunds: jest.fn().mockReturnValue(of({ success: true, data: [existingFund] })),
            createFund,
          },
        },
        {
          provide: FamilyService,
          useValue: { getFamilies: jest.fn().mockReturnValue(of({ data: [] })) },
        },
        {
          provide: AuthService,
          useValue: { hasPermission },
        },
        {
          provide: ConfirmationDialogService,
          useValue: { confirm: jest.fn() },
        },
        {
          provide: ToastService,
          useValue: { success: jest.fn(), error: jest.fn() },
        },
        {
          provide: ChurchCurrencyService,
          useValue: { currencySymbol: () => '₹' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens the purpose modal from document capture while the fund panel is open', () => {
    jest.useFakeTimers();
    component.showForm = true;
    component.canCreatePurpose = true;
    component.purposeSearchTerm = 'Overlay purpose';
    fixture.detectChanges();
    const panel = document.createElement('div');
    panel.className = 'cf-select-create-panel';
    const btn = document.createElement('button');
    btn.className = 'cf-select-create__btn';
    panel.appendChild(btn);
    document.body.appendChild(panel);
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperty(event, 'target', { value: btn });
    component.handlePurposeFooterDocumentPointerDown(event);
    jest.runAllTimers();
    panel.remove();
    expect(component.showPurposeModal).toBe(true);
    expect(component.purposeModalName).toBe('Overlay purpose');
    jest.useRealTimers();
  });

  it('opens the purpose modal without changing fund_id when the footer is activated', () => {
    jest.useFakeTimers();
    component.showForm = true;
    component.planForm.patchValue({ fund_id: existingFund.id });
    fixture.detectChanges();

    component.onAddPurposeFromFooter('Brand new purpose');
    expect(component.planForm.value.fund_id).toBe(existingFund.id);
    expect(component.showPurposeModal).toBe(false);
    jest.runAllTimers();
    expect(component.showPurposeModal).toBe(true);
    expect(component.purposeModalName).toBe('Brand new purpose');
    jest.useRealTimers();
  });

  it('does not prefill the modal when the search partially matches an existing fund', () => {
    component.onAddPurposeFromFooter('Sunday');
    expect(component.purposeModalName).toBe('');
  });

  it('selects the new fund after a successful create', () => {
    const created = { id: 'fund-2', name: 'Mission', code: 'MISSION' };
    createFund.mockReturnValue(of({ success: true, data: created }));
    component.showForm = true;
    component.planForm.patchValue({ fund_id: existingFund.id });
    component.openPurposeModal('Mission');
    component.submitPurposeModal();
    fixture.detectChanges();

    expect(component.planForm.value.fund_id).toBe('fund-2');
    expect(component.funds.some((f) => f.id === 'fund-2')).toBe(true);
    expect(component.showPurposeModal).toBe(false);
  });

  it('does not call createFund for whitespace-only names', () => {
    component.openPurposeModal('   ');
    component.submitPurposeModal();
    expect(createFund).not.toHaveBeenCalled();
  });

  it('does not call createFund twice while a request is in flight', () => {
    createFund.mockReturnValue(of({ success: true, data: { id: 'x', name: 'X', code: 'X' } }));
    component.openPurposeModal('Valid name');
    component.creatingPurpose = true;
    component.submitPurposeModal();
    expect(createFund).not.toHaveBeenCalled();
  });

  it('keeps the previous fund_id and sets a modal error on API failure', () => {
    createFund.mockReturnValue(throwError(() => ({ status: 422, error: { message: 'Invalid name' } })));
    component.showForm = true;
    component.planForm.patchValue({ fund_id: existingFund.id });
    component.openPurposeModal('Bad');
    component.submitPurposeModal();
    fixture.detectChanges();

    expect(component.planForm.value.fund_id).toBe(existingFund.id);
    expect(component.formError).toBeNull();
    expect(component.purposeModalError).toBe('Invalid name');
  });

  it('opens the modal with the typed term when Enter is used and nothing matches', () => {
    component.canCreatePurpose = true;
    component.purposeSearchTerm = 'Unique purpose label';
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    component.onFundSelectKeydown(event);
    expect(component.showPurposeModal).toBe(true);
    expect(component.purposeModalName).toBe('Unique purpose label');
  });

  it('does not open the modal on Enter when the search matches a fund', () => {
    component.canCreatePurpose = true;
    component.purposeSearchTerm = 'Sunday';
    component.onFundSelectKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.showPurposeModal).toBe(false);
  });

  it('refreshes canCreatePurpose when the select opens', () => {
    hasPermission.mockReturnValue(false);
    component.onFundSelectOpen();
    expect(component.canCreatePurpose).toBe(false);
  });
});

describe('DonationsPlansComponent — new plan form layout & workflow', () => {
  let fixture: ComponentFixture<DonationsPlansComponent>;
  let component: DonationsPlansComponent;
  let createPlan: jest.Mock;

  const existingFund = { id: 'fund-1', name: 'Sunday Offering', code: 'SUN' };
  const samplePlan = {
    id: 'plan-1',
    name: 'Monthly Dues',
    code: 'MONTHLY',
    fund_id: existingFund.id,
    plan_type: 'uniform',
    frequency: 'monthly',
    custom_interval_days: null,
    default_amount: 500,
    start_date: '2026-01-01',
    end_date: null,
    auto_generate: true,
    status: 'active',
    assignments_count: 0,
  };

  beforeEach(async () => {
    createPlan = jest.fn();

    await TestBed.configureTestingModule({
      imports: [DonationsPlansComponent],
      providers: [
        provideRouter([]),
        {
          provide: DonationsService,
          useValue: {
            getPlans: jest.fn().mockReturnValue(of({ success: true, data: [samplePlan] })),
            getFunds: jest.fn().mockReturnValue(of({ success: true, data: [existingFund] })),
            getPlan: jest.fn().mockReturnValue(of({ success: true, data: samplePlan })),
            createPlan: createPlan.mockReturnValue(
              of({ success: true, data: { ...samplePlan, id: 'plan-new', name: 'New Plan' } })
            ),
            createFund: jest.fn(),
          },
        },
        {
          provide: FamilyService,
          useValue: { getFamilies: jest.fn().mockReturnValue(of({ data: [] })) },
        },
        {
          provide: AuthService,
          useValue: { hasPermission: jest.fn().mockReturnValue(true) },
        },
        {
          provide: ConfirmationDialogService,
          useValue: { confirm: jest.fn() },
        },
        {
          provide: ToastService,
          useValue: { success: jest.fn(), error: jest.fn() },
        },
        {
          provide: ChurchCurrencyService,
          useValue: { currencySymbol: () => '₹' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function openForm(): void {
    component.openCreateForm();
    fixture.detectChanges();
  }

  it('renders save then cancel in the plan form footer action row', () => {
    openForm();
    const actions = fixture.nativeElement.querySelector('.plan-actions') as HTMLElement;
    expect(actions).toBeTruthy();
    const labels = Array.from(actions.querySelectorAll('button')).map((btn) => btn.getAttribute('aria-label'));
    expect(labels).toEqual(['Create plan', 'Cancel']);
    expect(actions.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('shows header close control while the form is open', () => {
    openForm();
    const headerClose = fixture.nativeElement.querySelector('.plans-card__close') as HTMLButtonElement;
    expect(headerClose).toBeTruthy();
    expect(headerClose.getAttribute('aria-label')).toBe('Close form');
  });

  it('closes the form from footer cancel without saving', () => {
    openForm();
    const cancel = fixture.nativeElement.querySelector('.plan-actions button[aria-label="Cancel"]') as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();
    expect(component.showForm).toBe(false);
    expect(fixture.nativeElement.querySelector('.plan-actions')).toBeNull();
  });

  it('closes the form from the header close control', () => {
    openForm();
    const headerClose = fixture.nativeElement.querySelector('.plans-card__close') as HTMLButtonElement;
    headerClose.click();
    fixture.detectChanges();
    expect(component.showForm).toBe(false);
  });

  it('creates a plan and closes the form on successful save', () => {
    openForm();
    component.planForm.patchValue({
      name: 'New Plan',
      fund_id: existingFund.id,
      default_amount: 250,
      start_date: '2026-10-21',
      frequency: 'monthly',
    });
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form.plan-sheet__form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(createPlan).toHaveBeenCalled();
    expect(component.showForm).toBe(false);
  });

  it('keeps edit workflow actions in the same right-aligned footer', () => {
    component.editPlan(samplePlan as never);
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('.plan-actions') as HTMLElement;
    const save = actions.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(save.getAttribute('aria-label')).toBe('Save changes');
    expect(actions.querySelector('button[aria-label="Cancel"]')).toBeTruthy();
  });
});
