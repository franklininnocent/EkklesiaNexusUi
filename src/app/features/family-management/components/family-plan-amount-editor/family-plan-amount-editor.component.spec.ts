import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FamilyPlanAmountEditorComponent } from './family-plan-amount-editor.component';
import { DonationsService } from '@features/donations/services/donations.service';
import { ToastService } from '@core/services/toast.service';
import { ChurchCurrencyService } from '@core/services/church-currency.service';

describe('FamilyPlanAmountEditorComponent', () => {
  let fixture: ComponentFixture<FamilyPlanAmountEditorComponent>;
  let component: FamilyPlanAmountEditorComponent;
  let getPlans: jest.Mock;
  let saveFamilyPlanAssignment: jest.Mock;

  const individualPlan = {
    id: 'plan-ind',
    name: 'Plan ABC',
    code: 'ABC',
    plan_type: 'individual' as const,
    status: 'active',
    frequency: 'yearly',
    default_amount: 1,
    fund_id: 'f1',
  };

  const uniformPlan = {
    id: 'plan-uni',
    name: 'Uniform',
    code: 'UNI',
    plan_type: 'uniform' as const,
    status: 'active',
    frequency: 'monthly',
    default_amount: 1500,
    fund_id: 'f1',
  };

  beforeEach(async () => {
    getPlans = jest.fn().mockReturnValue(of({ success: true, data: [individualPlan, uniformPlan] }));
    saveFamilyPlanAssignment = jest.fn().mockReturnValue(of({
      success: true,
      data: { amount: 2000, family_id: 'family-1', plan_id: 'plan-ind' },
    }));

    await TestBed.configureTestingModule({
      imports: [FamilyPlanAmountEditorComponent],
      providers: [
        provideRouter([]),
        {
          provide: DonationsService,
          useValue: { getPlans, saveFamilyPlanAssignment },
        },
        {
          provide: ToastService,
          useValue: { success: jest.fn(), error: jest.fn() },
        },
        {
          provide: ChurchCurrencyService,
          useValue: {
            currencySymbol: () => '$',
            formatAmount: (v: number) => `$${v}`,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyPlanAmountEditorComponent);
    component = fixture.componentInstance;
    component.familyId = 'family-1';
    component.assignments = [];
  });

  it('loads only individual active plans when opened', () => {
    component.open = true;
    component.beginOpen();
    fixture.detectChanges();

    expect(getPlans).toHaveBeenCalled();
    expect(component.eligiblePlans.map((p) => p.id)).toEqual(['plan-ind']);
  });

  it('shows unconfigured state until assignment exists', () => {
    component.open = true;
    component.beginOpen();
    fixture.detectChanges();

    component.form.patchValue({ plan_id: 'plan-ind' });
    component.onPlanChange();
    expect(component.configuredAmountForSelected()).toBeNull();
  });

  it('loads configured amount from assignments when switching plans', () => {
    component.assignments = [{ plan_id: 'plan-ind', assigned_amount: 2000 }];
    component.open = true;
    component.beginOpen('plan-ind');
    fixture.detectChanges();

    component.form.patchValue({ plan_id: 'plan-ind' });
    component.onPlanChange();
    expect(component.configuredAmountForSelected()).toBe(2000);
    expect(component.form.value.amount).toBe('2000');
  });

  it('saves via family-scoped endpoint', () => {
    const saved = jest.fn();
    component.saved.subscribe(saved);
    component.open = true;
    component.beginOpen();
    fixture.detectChanges();

    component.form.patchValue({ plan_id: 'plan-ind', amount: '2000' });
    component.submit();

    expect(saveFamilyPlanAssignment).toHaveBeenCalledWith('family-1', {
      plan_id: 'plan-ind',
      amount: 2000,
    });
    expect(saved).toHaveBeenCalled();
  });

  it('rejects invalid amount on submit', () => {
    component.open = true;
    component.beginOpen();
    fixture.detectChanges();

    component.form.patchValue({ plan_id: 'plan-ind', amount: '0' });
    component.submit();
    expect(saveFamilyPlanAssignment).not.toHaveBeenCalled();
  });

  it('retains values when save fails', () => {
    saveFamilyPlanAssignment.mockReturnValue(throwError(() => ({ error: { message: 'Failed' } })));
    component.open = true;
    component.beginOpen();
    fixture.detectChanges();

    component.form.patchValue({ plan_id: 'plan-ind', amount: '2000' });
    component.submit();

    expect(component.form.value.amount).toBe('2000');
    expect(component.submitError).toBe('Failed');
  });
});
