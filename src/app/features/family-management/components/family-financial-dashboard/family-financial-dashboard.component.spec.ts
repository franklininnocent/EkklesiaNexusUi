import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { EntitlementService } from '@core/services/entitlement.service';
import { ChurchCurrencyService } from '@core/services/church-currency.service';
import { QuickCollectService } from '@features/donations/services/quick-collect.service';
import { ReceiptPrintService } from '@features/donations/services/receipt-print.service';
import { FamilyFinancialDashboardComponent } from './family-financial-dashboard.component';
import { DonationFamilyFinancialProfile } from '@features/donations/models/donation.model';

describe('FamilyFinancialDashboardComponent — plan amounts', () => {
  let fixture: ComponentFixture<FamilyFinancialDashboardComponent>;
  let allows: jest.Mock;

  const profile: DonationFamilyFinancialProfile = {
    family_id: 'family-1',
    totals: {
      total_paid: 0,
      pending_due: 0,
      pending_mandatory_due: 0,
      pending_project_due: 0,
      overdue_count: 0,
      net: 0,
    },
    mandatory_contributions: {
      assignments: [],
      contribution_plans: [
        {
          plan_id: 'plan-ind',
          plan_name: 'Individual Plan',
          plan_type: 'individual',
          assigned_amount: 0,
          amount_paid: 0,
          amount_pending: 0,
          outstanding_balance: 0,
          installment_count: 0,
          overdue_count: 0,
          status: 'active',
        },
        {
          plan_id: 'plan-uni',
          plan_name: 'Uniform Plan',
          plan_type: 'uniform',
          assigned_amount: 1500,
          amount_paid: 0,
          amount_pending: 0,
          outstanding_balance: 0,
          installment_count: 0,
          overdue_count: 0,
          status: 'active',
        },
      ],
      outstanding_dues: [],
    },
  };

  beforeEach(async () => {
    allows = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [FamilyFinancialDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ActionAuthorizationService, useValue: { allows } },
        {
          provide: EntitlementService,
          useValue: {
            load: () => ({ subscribe: () => undefined }),
            entitlements: () => ({ features: { CONTRIBUTION_PLANS: true } }),
            hasFeature: () => true,
            hasAllFeatures: () => true,
          },
        },
        {
          provide: ChurchCurrencyService,
          useValue: { formatAmount: (v: number) => String(v), currencySymbol: () => '$' },
        },
        { provide: QuickCollectService, useValue: { openForFamily: jest.fn() } },
        { provide: ReceiptPrintService, useValue: { printFamilyStatement: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyFinancialDashboardComponent);
    fixture.componentInstance.profile = profile;
    fixture.componentInstance.familyId = 'family-1';
  });

  it('shows Set Plan Amount when user can manage donations', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const setPlanBtn = Array.from(buttons).find((el) => el.textContent?.includes('Set Plan Amount'));
    expect(setPlanBtn).toBeTruthy();
  });

  it('hides Set Plan Amount without donations.manage', () => {
    allows.mockReturnValue(false);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const setPlanBtn = Array.from(buttons).find((el) => el.textContent?.includes('Set Plan Amount'));
    expect(setPlanBtn).toBeUndefined();
  });

  it('shows Edit amount only on individual plan rows', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const editButtons = Array.from(buttons).filter((el) => el.textContent?.trim() === 'Edit amount');
    expect(editButtons.length).toBe(1);
  });
});
