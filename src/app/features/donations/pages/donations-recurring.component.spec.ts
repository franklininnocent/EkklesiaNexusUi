import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { DonationsRecurringComponent } from './donations-recurring.component';
import { DonationsService } from '../services/donations.service';

describe('DonationsRecurringComponent — donor create from select', () => {
  let fixture: ComponentFixture<DonationsRecurringComponent>;
  let component: DonationsRecurringComponent;
  let createDonor: jest.Mock;
  let hasPermission: jest.Mock;

  const existingDonor = { id: 'donor-1', name: 'Parish Friend', donor_type: 'external' };

  beforeEach(async () => {
    createDonor = jest.fn();
    hasPermission = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [DonationsRecurringComponent],
      providers: [
        provideRouter([]),
        {
          provide: DonationsService,
          useValue: {
            getDonors: jest.fn().mockReturnValue(of({ data: { data: [existingDonor] } })),
            getCategories: jest.fn().mockReturnValue(of({ data: [] })),
            getRecurringSchedules: jest.fn().mockReturnValue(of({ data: { data: [] } })),
            createDonor,
          },
        },
        { provide: AuthService, useValue: { hasPermission } },
        { provide: ActionAuthorizationService, useValue: { allows: (id: string) => hasPermission(id) } },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsRecurringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens the donor modal from document capture while the donor panel is open', () => {
    jest.useFakeTimers();
    component.showForm = true;
    component.canCreateDonor = true;
    component.donorSearchTerm = 'New supporter';
    fixture.detectChanges();
    const panel = document.createElement('div');
    panel.className = 'recurring-donor-create-panel';
    const btn = document.createElement('button');
    btn.className = 'cf-select-create__btn';
    panel.appendChild(btn);
    document.body.appendChild(panel);
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperty(event, 'target', { value: btn });
    component.handleDonorFooterDocumentPointerDown(event);
    jest.runAllTimers();
    panel.remove();
    expect(component.showDonorModal).toBe(true);
    expect(component.donorModalForm.value.name).toBe('New supporter');
    jest.useRealTimers();
  });

  it('selects the new donor after a successful create', () => {
    const created = { id: 'donor-2', name: 'Mission Partner', donor_type: 'external' };
    createDonor.mockReturnValue(of({ success: true, data: created }));
    component.showForm = true;
    component.form.patchValue({ donor_id: existingDonor.id });
    component.openDonorModal('Mission Partner');
    component.donorModalForm.patchValue({ email: 'partner@example.com', donor_type: 'organization' });
    component.submitDonorModal();
    expect(createDonor).toHaveBeenCalledWith({
      name: 'Mission Partner',
      email: 'partner@example.com',
      donor_type: 'organization',
    });
    fixture.detectChanges();
    expect(component.form.value.donor_id).toBe('donor-2');
    expect(component.showDonorModal).toBe(false);
  });

  it('does not prefill the modal when the search partially matches an existing donor', () => {
    jest.useFakeTimers();
    component.onAddDonorFromFooter();
    jest.runAllTimers();
    expect(component.donorModalForm.value.name).toBe('');
    component.donorSearchTerm = 'Parish';
    component.onAddDonorFromFooter();
    jest.runAllTimers();
    expect(component.donorModalForm.value.name).toBe('');
    jest.useRealTimers();
  });

  it('keeps the previous donor_id on API failure', () => {
    createDonor.mockReturnValue(throwError(() => ({ status: 422, error: { message: 'Invalid name' } })));
    component.showForm = true;
    component.form.patchValue({ donor_id: existingDonor.id });
    component.openDonorModal('Bad');
    component.submitDonorModal();
    fixture.detectChanges();
    expect(component.form.value.donor_id).toBe('donor-1');
    expect(component.donorModalError).toBe('Invalid name');
  });
});
