import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationDialogService } from '@core/services/confirmation-dialog.service';
import { DonationsCategoriesComponent } from './donations-categories.component';
import { DonationsService } from '../services/donations.service';

describe('DonationsCategoriesComponent', () => {
  let fixture: ComponentFixture<DonationsCategoriesComponent>;
  let hasPermission: jest.Mock;

  beforeEach(async () => {
    hasPermission = jest.fn().mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [DonationsCategoriesComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { hasPermission },
        },
        { provide: ActionAuthorizationService, useValue: { allows: (id: string) => hasPermission(id) } },
        {
          provide: DonationsService,
          useValue: {
            getCategories: jest.fn().mockReturnValue(of({ data: [{ id: 'c1', name: 'General', code: 'GEN' }] })),
          },
        },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
        { provide: ConfirmationDialogService, useValue: { confirm: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsCategoriesComponent);
    fixture.detectChanges();
  });

  it('shows Record a gift only when the user can collect', () => {
    hasPermission.mockImplementation((perm: string) => perm === 'donations.collect');
    fixture = TestBed.createComponent(DonationsCategoriesComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Record a gift');
    expect(fixture.nativeElement.querySelector('button[aria-label="New"]')).toBeNull();
  });

  it('shows New only when the user can manage categories', () => {
    hasPermission.mockImplementation((perm: string) => perm === 'donations.manage');
    fixture = TestBed.createComponent(DonationsCategoriesComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Record a gift');
    expect(fixture.nativeElement.querySelector('button[aria-label="New"]')).toBeTruthy();
  });
});
