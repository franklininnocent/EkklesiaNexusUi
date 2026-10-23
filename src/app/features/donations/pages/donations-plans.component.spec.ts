import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
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
        { provide: ActionAuthorizationService, useValue: { allows: (id: string) => hasPermission(id) } },
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
            getPlanAssignments: jest.fn().mockReturnValue(of({ success: true, data: { data: [] } })),
            savePlanAssignment: jest.fn().mockReturnValue(of({ success: true, data: { family_id: 'fam-1', amount: 0, is_exempt: true } })),
            previewPlanGeneration: jest.fn().mockReturnValue(of({
              success: true,
              data: {
                period_count: 1,
                family_count: 5,
                estimated_new_ops: 5,
                eligible_family_count: 4,
                exempt_family_count: 1,
                already_billed_count: 2,
                expected_new_amount: 1500,
                periods: [],
              },
            })),
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
        { provide: ActionAuthorizationService, useValue: { allows: () => true } },
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
          useValue: { currencySymbol: () => '₹', formatAmount: (value: number) => `CUR ${value}` },
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

  it('keeps the form open after save and does not send uniform exceptions on the plan', () => {
    openForm();
    component.planForm.patchValue({
      name: 'New Plan',
      fund_id: existingFund.id,
      default_amount: 250,
      start_date: '2026-10-21',
      frequency: 'one_time',
      plan_type: 'uniform',
    });
    component.onFrequencyChange();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form.plan-sheet__form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(createPlan).toHaveBeenCalled();
    expect(component.showForm).toBe(true);
    expect(component.editingPlanId).toBe('plan-new');
    expect(createPlan.mock.calls[0][0].assignments).toEqual([]);
    expect(component.planForm.value.auto_generate).toBe(false);
  });

  it('saves a uniform exception on the assignment endpoint', () => {
    const donations = TestBed.inject(DonationsService) as unknown as { savePlanAssignment: jest.Mock };
    component.editingPlanId = 'plan-1';
    component.exceptionFamilyId = 'fam-1';
    component.exceptionExempt = true;
    component.exceptionEffectiveFrom = '2026-12-25';
    component.saveException();
    expect(donations.savePlanAssignment).toHaveBeenCalledWith('plan-1', expect.objectContaining({
      family_id: 'fam-1',
      amount: 0,
      is_exempt: true,
    }));
  });

  it('confirms billing with eligible, exempt, and already billed counts', () => {
    const confirm = TestBed.inject(ConfirmationDialogService).confirm as jest.Mock;
    confirm.mockReturnValue(of({ confirmed: false }));
    component.plans = [samplePlan as never];
    component.generateDues(samplePlan as never);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Families who will receive a new bill: 4'),
    }));
    const message = confirm.mock.calls[0][0].message as string;
    expect(message).toContain('Exempt: 1');
    expect(message).toContain('Already billed and left unchanged: 2');
    expect(message).toContain('CUR 1500');
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

describe('DonationsPlansComponent — family-specific contribution plans', () => {
  let fixture: ComponentFixture<DonationsPlansComponent>;
  let component: DonationsPlansComponent;
  let createPlan: jest.Mock;
  let updatePlan: jest.Mock;
  let getPlan: jest.Mock;

  const existingFund = { id: 'fund-1', name: 'Sunday Offering', code: 'SUN' };
  const familyA = {
    id: 'fam-a',
    family_code: 'FAM000001',
    family_name: 'Wilson',
    head_of_family: 'Leonard Wilson',
  };
  const familyB = {
    id: 'fam-b',
    family_code: 'FAM000002',
    family_name: 'K',
    head_of_family: 'Robbin K',
  };

  beforeEach(async () => {
    createPlan = jest.fn();
    updatePlan = jest.fn();
    getPlan = jest.fn();

    await TestBed.configureTestingModule({
      imports: [DonationsPlansComponent],
      providers: [
        provideRouter([]),
        {
          provide: DonationsService,
          useValue: {
            getPlans: jest.fn().mockReturnValue(of({ success: true, data: [] })),
            getFunds: jest.fn().mockReturnValue(of({ success: true, data: [existingFund] })),
            getPlan,
            getPlanAssignments: jest.fn().mockReturnValue(of({ success: true, data: { data: [] } })),
            createPlan: createPlan.mockReturnValue(
              of({
                success: true,
                data: {
                  id: 'plan-ind',
                  name: 'Educational fund',
                  plan_type: 'individual',
                  fund_id: existingFund.id,
                  frequency: 'monthly',
                  default_amount: 100,
                  start_date: '2026-10-21',
                  assignments: [
                    { family_id: 'fam-a', amount: 100, effective_from: '2026-10-21', status: 'active' },
                  ],
                },
              })
            ),
            updatePlan: updatePlan.mockReturnValue(
              of({ success: true, data: { id: 'plan-ind', plan_type: 'individual', assignments: [] } })
            ),
            createFund: jest.fn(),
          },
        },
        {
          provide: FamilyService,
          useValue: { getFamilies: jest.fn().mockReturnValue(of({ data: [familyA, familyB] })) },
        },
        {
          provide: AuthService,
          useValue: { hasPermission: jest.fn().mockReturnValue(true) },
        },
        { provide: ActionAuthorizationService, useValue: { allows: () => true } },
        { provide: ConfirmationDialogService, useValue: { confirm: jest.fn() } },
        {
          provide: ToastService,
          useValue: { success: jest.fn(), error: jest.fn() },
        },
        {
          provide: ChurchCurrencyService,
          useValue: {
            currencySymbol: () => '₹',
            currencyCode: () => 'INR',
            formatAmount: (value: number) => `CUR ${value}`,
          },
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

  function fillBasePlanFields(): void {
    component.planForm.patchValue({
      name: 'Educational fund',
      fund_id: existingFund.id,
      start_date: '2026-10-21',
      frequency: 'monthly',
    });
  }

  function setIndividualMode(): void {
    component.onSameAmountToggle({ target: { checked: false } } as unknown as Event);
    fixture.detectChanges();
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form.plan-sheet__form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows the family amounts section when same amount for all is unchecked', () => {
    openForm();
    setIndividualMode();
    expect(fixture.nativeElement.querySelector('.plan-family-amounts')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#plan-amount')).toBeNull();
  });

  it('saves a uniform plan with empty assignments', () => {
    openForm();
    fillBasePlanFields();
    component.planForm.patchValue({ default_amount: 250, plan_type: 'uniform' });
    submitForm();
    expect(createPlan).toHaveBeenCalled();
    expect(createPlan.mock.calls[0][0].assignments).toEqual([]);
  });

  it('commits a completed pending row on save', () => {
    openForm();
    fillBasePlanFields();
    setIndividualMode();
    component.selectedFamilyId = 'fam-a';
    component.assignmentAmount = 150;
    component.assignmentEffectiveFrom = '2026-10-21';
    submitForm();
    expect(createPlan).toHaveBeenCalled();
    expect(createPlan.mock.calls[0][0].assignments).toEqual([
      expect.objectContaining({ family_id: 'fam-a', amount: 150 }),
    ]);
  });

  it('adds a family amount via the add control', () => {
    openForm();
    setIndividualMode();
    component.selectedFamilyId = 'fam-b';
    component.assignmentAmount = 200;
    component.addAssignment();
    expect(component.draftAssignments).toHaveLength(1);
    expect(component.draftAssignments[0].family_id).toBe('fam-b');
  });

  it('rejects an empty individual plan on submit', () => {
    openForm();
    fillBasePlanFields();
    setIndividualMode();
    submitForm();
    expect(createPlan).not.toHaveBeenCalled();
    expect(component.formError).toContain('at least one family amount');
  });

  it('rejects an incomplete pending row on submit', () => {
    openForm();
    fillBasePlanFields();
    setIndividualMode();
    component.selectedFamilyId = 'fam-a';
    component.assignmentAmount = 0;
    submitForm();
    expect(createPlan).not.toHaveBeenCalled();
    expect(component.formError).toBeTruthy();
  });

  it('rejects a zero amount when adding', () => {
    openForm();
    setIndividualMode();
    component.selectedFamilyId = 'fam-a';
    component.assignmentAmount = 0;
    component.addAssignment();
    expect(component.draftAssignments).toHaveLength(0);
    expect(component.assignmentAddHint).toContain('greater than zero');
  });

  it('maps multiple family amounts into the create payload', () => {
    openForm();
    fillBasePlanFields();
    setIndividualMode();
    component.draftAssignments = [
      { family_id: 'fam-a', amount: 100, effective_from: '2026-10-21', status: 'active' },
      { family_id: 'fam-b', amount: 200, effective_from: '2026-10-21', status: 'active' },
    ];
    submitForm();
    expect(createPlan.mock.calls[0][0].assignments).toHaveLength(2);
    expect(createPlan.mock.calls[0][0].default_amount).toBe(100);
  });

  it('updates validation after removing a family amount row', () => {
    openForm();
    fillBasePlanFields();
    setIndividualMode();
    component.draftAssignments = [
      { family_id: 'fam-a', amount: 100, effective_from: '2026-10-21', status: 'active' },
    ];
    component.removeAssignment(0);
    submitForm();
    expect(createPlan).not.toHaveBeenCalled();
  });

  it('rejects duplicate families in the draft list', () => {
    openForm();
    setIndividualMode();
    component.draftAssignments = [
      { family_id: 'fam-a', amount: 100, effective_from: '2026-10-21', status: 'active' },
    ];
    component.selectedFamilyId = 'fam-a';
    component.assignmentAmount = 50;
    component.addAssignment();
    expect(component.draftAssignments).toHaveLength(1);
    expect(component.assignmentAddHint).toContain('already listed');
  });

  it('clears draft assignments when switching back to uniform pricing', () => {
    openForm();
    setIndividualMode();
    component.draftAssignments = [
      { family_id: 'fam-a', amount: 100, effective_from: '2026-10-21', status: 'active' },
    ];
    component.onSameAmountToggle({ target: { checked: true } } as unknown as Event);
    expect(component.draftAssignments).toHaveLength(0);
    expect(component.planForm.value.plan_type).toBe('uniform');
  });

  it('hydrates draft assignments when editing an individual plan', () => {
    getPlan.mockReturnValue(
      of({
        success: true,
        data: {
          id: 'plan-ind',
          name: 'Educational fund',
          fund_id: existingFund.id,
          plan_type: 'individual',
          frequency: 'monthly',
          default_amount: 1,
          start_date: '2026-10-21',
          assignments: [
            { family_id: 'fam-a', amount: 300, effective_from: '2026-10-21', status: 'active' },
          ],
        },
      })
    );
    component.editPlan({
      id: 'plan-ind',
      name: 'Educational fund',
      fund_id: existingFund.id,
      plan_type: 'individual',
      frequency: 'monthly',
      default_amount: 1,
      start_date: '2026-10-21',
      status: 'active',
      code: 'EDU',
    } as never);
    fixture.detectChanges();
    expect(component.draftAssignments).toHaveLength(1);
    expect(component.draftAssignments[0].amount).toBe(300);
  });

  it('surfaces API validation errors on assignments', () => {
    createPlan.mockReturnValue(
      throwError(() => ({
        status: 422,
        error: { errors: { 'assignments.0.family_id': ['The selected family is invalid.'] } },
      }))
    );
    openForm();
    fillBasePlanFields();
    setIndividualMode();
    component.draftAssignments = [
      { family_id: 'fam-a', amount: 100, effective_from: '2026-10-21', status: 'active' },
    ];
    submitForm();
    expect(component.formError).toContain('invalid');
  });

  it('uses picker labels for family display names', () => {
    expect(component.familyName('fam-a')).toBe('FAM000001 - Leonard Wilson');
    const codeOnly = {
      id: 'fam-x',
      family_code: 'FAM000004',
      family_name: 'Marshall',
    };
    component.families = [...component.families, codeOnly as never];
    expect(component.familyName('fam-x')).toBe('FAM000004 - —');
  });

  it('requires family amounts when updating an individual plan', () => {
    component.editingPlanId = 'plan-ind';
    component.showForm = true;
    fillBasePlanFields();
    setIndividualMode();
    component.draftAssignments = [];
    submitForm();
    expect(updatePlan).not.toHaveBeenCalled();
    expect(component.formError).toContain('at least one family amount');
  });
});
