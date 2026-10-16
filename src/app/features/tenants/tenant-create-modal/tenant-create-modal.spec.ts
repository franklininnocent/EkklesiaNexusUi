import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TenantCreateModalComponent } from './tenant-create-modal';
import { TenantService } from '@core/services/tenant.service';
import { ToastService } from '@core/services/toast.service';
import { GeographyService } from '@core/services/geography.service';
import { ArchdioceseService } from '@core/services/church/archdiocese.service';
import { PhoneCodeService } from '@core/services/phone-code.service';
import { CatalogPlan } from '@features/subscriptions/models/subscription-admin.models';
import { SubscriptionAdminService } from '@features/subscriptions/services/subscription-admin.service';
import { of, throwError } from 'rxjs';

const catalogPlans = [
  {
    id: 1,
    code: 'STARTER',
    key: 'starter',
    name: 'Starter',
    short_description: 'Parish essentials',
    pricing_type: 'FIXED',
    status: 'ACTIVE',
    is_assignable: true,
    is_legacy: false,
    is_default: true,
    active_version: {
      id: 11,
      currency_code: 'INR',
      monthly_price: '1499.00',
      limit_summary: [{ code: 'USERS', name: 'Users', unit: null, value: 5, unlimited: false }],
    },
  },
  {
    id: 2,
    code: 'STANDARD',
    key: 'standard',
    name: 'Standard',
    short_description: 'Growing parishes',
    pricing_type: 'FIXED',
    status: 'ACTIVE',
    is_assignable: true,
    is_legacy: false,
    is_default: false,
    active_version: { id: 12, currency_code: 'INR', monthly_price: '2999.00', limit_summary: [] },
  },
  {
    id: 3,
    code: 'OLD',
    key: 'old',
    name: 'Old',
    pricing_type: 'FIXED',
    status: 'ARCHIVED',
    is_assignable: true,
    is_legacy: false,
    is_default: false,
    active_version: { id: 13, currency_code: 'INR', monthly_price: '1.00' },
  },
  {
    id: 4,
    code: 'LEGACY_FREE',
    key: 'free',
    name: 'Free (legacy)',
    pricing_type: 'FREE',
    status: 'ACTIVE',
    is_assignable: false,
    is_legacy: true,
    is_default: false,
    active_version: { id: 14, currency_code: 'INR', monthly_price: '0.00' },
  },
  {
    id: 5,
    code: 'DRAFTY',
    key: 'drafty',
    name: 'Drafty',
    pricing_type: 'FIXED',
    status: 'ACTIVE',
    is_assignable: true,
    is_legacy: false,
    is_default: false,
    active_version: null,
  },
] as unknown as CatalogPlan[];

function validForm() {
  return {
    tenant_name: 'Acme Church',
    slogan: '',
    tenant_official_address: {
      line1: '123 Main',
      line2: '',
      country_id: 1,
      state_id: 10,
      district: 'Springfield',
      pin_zip_code: '12345',
    },
    primary_user_name: 'John Doe',
    primary_user_email: 'john@example.com',
    primary_user_password: 'Strong1!',
    primary_user_password_confirmation: 'Strong1!',
    primary_contact_number: '555123456',
    primary_user_address: {
      line1: '123 Main',
      line2: '',
      country_id: 1,
      state_id: 10,
      district: 'Springfield',
      pin_zip_code: '12345',
    },
  };
}

describe('TenantCreateModalComponent', () => {
  let component: TenantCreateModalComponent;
  let fixture: ComponentFixture<TenantCreateModalComponent>;
  let tenantService: { createTenant: jest.Mock };
  let toastService: { success: jest.Mock; error: jest.Mock };
  let geographyService: { getCountries: jest.Mock; getStatesByCountry: jest.Mock };
  let archdioceseService: { getArchdioceses: jest.Mock };
  let subscriptionAdmin: { listPlans: jest.Mock };

  beforeEach(async () => {
    tenantService = {
      createTenant: jest.fn().mockReturnValue(of({ success: true, message: 'ok' })),
    };
    toastService = { success: jest.fn(), error: jest.fn() };
    geographyService = {
      getCountries: jest.fn().mockReturnValue(of({ success: true, data: [], count: 0 })),
      getStatesByCountry: jest.fn().mockReturnValue(of({ success: true, data: [], count: 0 }))
    };
    archdioceseService = {
      getArchdioceses: jest.fn().mockReturnValue(of({
        success: true,
        data: [{ id: 5, name: 'Archdiocese of Test', country: 'India', active: 1 }],
      })),
    };
    subscriptionAdmin = {
      listPlans: jest.fn().mockReturnValue(of([])),
    };
    const phoneCodeService = {
      initializeFromApiOnce: jest.fn().mockReturnValue(of({ success: true, countryCode: 'IN', phoneCode: '+91' })),
      updatePhoneCodeByCountryId: jest.fn().mockReturnValue(of({ success: true, phoneCode: '+91', countryName: 'India' })),
      getPhoneCodeSync: jest.fn().mockReturnValue('+91'),
      currentPhoneCode: jest.fn().mockReturnValue('+91'),
      resetToDefault: jest.fn()
    } as unknown as PhoneCodeService;

    await TestBed.configureTestingModule({
      imports: [TenantCreateModalComponent],
      providers: [
        { provide: TenantService, useValue: tenantService },
        { provide: ToastService, useValue: toastService },
        { provide: GeographyService, useValue: geographyService },
        { provide: ArchdioceseService, useValue: archdioceseService },
        { provide: PhoneCodeService, useValue: phoneCodeService },
        { provide: SubscriptionAdminService, useValue: subscriptionAdmin },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TenantCreateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('invalid by default with required errors', () => {
    const valid = component.validateForm();
    expect(valid).toBe(false);
    expect(component.getFieldError('tenant_name')).toBeTruthy();
    expect(component.getFieldError('tenant_official_address.country_id')).toBeTruthy();
    expect(component.getFieldError('primary_user_email')).toBeTruthy();
    expect(component.getFieldError('primary_user_password')).toBeTruthy();
  });

  it('rejects weak or mismatched passwords', () => {
    component.formData = {
      tenant_name: 'Acme Church',
      slogan: '',
      tenant_official_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      },
      primary_user_name: 'John Doe',
      primary_user_email: 'john@example.com',
      primary_user_password: 'weak',
      primary_user_password_confirmation: 'different',
      primary_contact_number: '555123456',
      primary_user_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      }
    } as any;

    expect(component.validateForm()).toBe(false);
    expect(component.getFieldError('primary_user_password')).toBeTruthy();
    expect(component.getFieldError('primary_user_password_confirmation')).toBeTruthy();
  });

  it('valid when required fields are provided correctly', () => {
    component.formData = {
      tenant_name: 'Acme Church',
      slogan: '',
      tenant_official_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      },
      primary_user_name: 'John Doe',
      primary_user_email: 'john@example.com',
      primary_user_password: 'Strong1!',
      primary_user_password_confirmation: 'Strong1!',
      primary_contact_number: '555123456',
      primary_user_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      }
    } as any;

    const valid = component.validateForm();
    expect(valid).toBe(true);
  });

  it('marks tenant official address fields touched on invalid submit', () => {
    component.onSubmit();
    expect(component.touched['tenant_official_address.country_id']).toBe(true);
    expect(component.touched['tenant_official_address.line1']).toBe(true);
    expect(component.isFieldInvalid('tenant_official_address.country_id')).toBe(true);
  });

  it('onSubmit sets serverError when invalid', () => {
    component.onSubmit();
    expect(component.serverError).toContain('Please fix the validation errors');
  });

  it('includes domain and diocese in create payload when provided', () => {
    component.formData = {
      tenant_name: 'Acme Church',
      slogan: '',
      domain: 'acme.example.org',
      archdiocese_id: 5,
      tenant_official_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      },
      primary_user_name: 'John Doe',
      primary_user_email: 'john@example.com',
      primary_user_password: 'Strong1!',
      primary_user_password_confirmation: 'Strong1!',
      primary_contact_number: '555123456',
      primary_user_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      }
    } as any;

    component.onSubmit();

    expect(tenantService.createTenant).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'acme.example.org',
      archdiocese_id: 5,
    }));
  });

  it('onSubmit calls service and clears serverError when valid', () => {
    component.formData = {
      tenant_name: 'Acme Church',
      slogan: '',
      tenant_official_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      },
      primary_user_name: 'John Doe',
      primary_user_email: 'john@example.com',
      primary_user_password: 'Strong1!',
      primary_user_password_confirmation: 'Strong1!',
      primary_contact_number: '555123456',
      primary_user_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      }
    } as any;

    component.onSubmit();
    expect(component.serverError).toBe('');
    expect(tenantService.createTenant).toHaveBeenCalled();
  });

  it('shows toast when create returns success false', () => {
    tenantService.createTenant.mockReturnValue(of({ success: false, message: 'Duplicate tenant' }));
    component.formData = {
      tenant_name: 'Acme Church',
      slogan: '',
      tenant_official_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      },
      primary_user_name: 'John Doe',
      primary_user_email: 'john@example.com',
      primary_user_password: 'Strong1!',
      primary_user_password_confirmation: 'Strong1!',
      primary_contact_number: '555123456',
      primary_user_address: {
        line1: '123 Main',
        line2: '',
        country_id: 1,
        state_id: 10,
        district: 'Springfield',
        pin_zip_code: '12345'
      }
    } as any;

    component.onSubmit();

    expect(toastService.error).toHaveBeenCalledWith('Duplicate tenant', 'Error', 6000);
    expect(component.serverError).toBe('Duplicate tenant');
  });

  it('sameAsTenantAddress copies address fields and keeps them in sync', () => {
    component.formData.tenant_official_address = {
      line1: 'A', line2: 'B', country_id: 1, state_id: 2, district: 'D', pin_zip_code: 'Z'
    } as any;
    component.sameAsTenantAddress = true;
    component.onSameAsTenantAddressChange();
    expect(component.formData.primary_user_address.line1).toBe('A');
    expect(component.formData.primary_user_address.country_id).toBe(1);

    component.formData.tenant_official_address.district = 'Updated';
    component.onTenantAddressFieldChange();
    expect(component.formData.primary_user_address.district).toBe('Updated');
  });

  it('country ng-select uses appendTo body', () => {
    expect(component.appendToBody).toBe('body');
  });

  it('loads states into tenant dropdown after country selection', () => {
    geographyService.getStatesByCountry.mockReturnValue(of({
      success: true,
      count: 2,
      data: [
        { id: 10, country_id: 101, name: 'Kerala' },
        { id: 11, country_id: 101, name: 'Tamil Nadu' },
      ],
    }));

    component.onTenantCountryChange(101);
    fixture.detectChanges();

    expect(geographyService.getStatesByCountry).toHaveBeenCalledWith(101);
    expect(component.tenantStateOptions).toHaveLength(2);
    expect(component.tenantStateOptions?.[0].name).toBe('Kerala');
    expect(fixture.nativeElement.querySelector('#tenantState')).toBeTruthy();
  });

  it('loads countries into the dropdown when geography data is available', () => {
    geographyService.getCountries.mockReturnValue(of({
      success: true,
      count: 2,
      data: [
        { id: 101, name: 'India', iso2: 'IN', iso3: 'IND' },
        { id: 233, name: 'United States', iso2: 'US', iso3: 'USA' },
      ],
    }));

    component.loadCountries();
    fixture.detectChanges();

    expect(geographyService.getCountries).toHaveBeenCalledWith({ refresh: true });
    expect(component.countries).toHaveLength(2);
    expect(component.countryOptions).toHaveLength(2);
    expect(component.countries[0].name).toBe('India');
    expect(component.loadingCountries).toBe(false);
    expect(component.countriesLoadError).toBe('');
    expect(fixture.nativeElement.querySelector('#tenantCountry')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#tenantCountryLoading')).toBeNull();
  });

  it('uses enterprise modal shell chrome and in-form footer actions', () => {
    const shell = fixture.nativeElement.querySelector('app-modal-shell');
    expect(shell).toBeTruthy();

    const modalShell = fixture.debugElement.children[0].componentInstance;
    expect(modalShell.size).toBe('lg');
    expect(modalShell.headerVariant).toBe('compact');
    expect(modalShell.bodyPadding).toBe('none');

    const form = fixture.nativeElement.querySelector('form.cf-split-form-body.tenant-create-modal');
    expect(form).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[modalFooter]')).toBeNull();

    const actions = fixture.nativeElement.querySelector('.cf-split-form-actions');
    expect(actions).toBeTruthy();

    const buttons = actions.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('type')).toBe('submit');
    expect(buttons[0].classList.contains('cf-btn-primary')).toBe(true);
    expect(buttons[1].getAttribute('type')).toBe('button');
    expect(buttons[1].textContent?.trim()).toBe('Cancel');
    expect(buttons[1].classList.contains('cf-btn')).toBe(true);
    expect(buttons[1].classList.contains('cf-btn-primary')).toBe(false);
  });

  it('shows Saving… label and disables footer buttons while submitting', () => {
    component.isSubmitting = true;
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelector('.cf-split-form-actions');
    const submitBtn = actions.querySelector('button[type="submit"]');
    const cancelBtn = actions.querySelector('button[type="button"]');

    expect(submitBtn.textContent?.trim()).toMatch(/Saving/);
    expect(submitBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });

  it('loads assignable plans, filters ineligible rows, and pre-selects the default', () => {
    subscriptionAdmin.listPlans.mockReturnValue(of(catalogPlans));
    component.loadPlans();
    fixture.detectChanges();

    expect(subscriptionAdmin.listPlans).toHaveBeenCalled();
    expect(component.assignablePlans.map((plan) => plan.key)).toEqual(['starter', 'standard']);
    expect(component.selectedPlanKey).toBe('starter');
    expect(fixture.nativeElement.querySelectorAll('input[name="tenantCreatePlan"]').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Default for new churches');
    expect(fixture.nativeElement.textContent).toContain('Starter');
  });

  it('submits the selected catalog plan key', () => {
    subscriptionAdmin.listPlans.mockReturnValue(of(catalogPlans));
    component.loadPlans();
    component.formData = validForm() as any;
    component.choosePlan(catalogPlans[1]);
    component.onSubmit();

    expect(tenantService.createTenant).toHaveBeenCalledWith(expect.objectContaining({
      plan: 'standard',
    }));
  });

  it('omits plan when the catalog is empty', () => {
    component.formData = validForm() as any;
    component.onSubmit();

    const payload = tenantService.createTenant.mock.calls[0][0];
    expect(payload.plan).toBeUndefined();
  });

  it('omits plan and shows an error when the catalog fails', () => {
    subscriptionAdmin.listPlans.mockReturnValue(throwError(() => ({ status: 500, message: 'Internal server error.' })));
    component.loadPlans();
    fixture.detectChanges();

    expect(component.plansLoadError).toBe('Unable to load plans.');
    expect(component.assignablePlans).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Try again');

    component.formData = validForm() as any;
    component.onSubmit();
    expect(tenantService.createTenant.mock.calls[0][0].plan).toBeUndefined();
  });

  it('maps API plan validation onto the plan control', () => {
    tenantService.createTenant.mockReturnValue(throwError(() => ({
      message: 'Validation error',
      errors: { plan: ['Selected plan is not available for new churches'] },
    })));
    component.formData = validForm() as any;
    component.selectedPlanKey = 'standard';
    component.onSubmit();

    expect(component.getFieldError('plan')).toBe('Selected plan is not available for new churches');
    expect(component.isFieldInvalid('plan')).toBe(true);
  });

  it('does not submit twice while the first request is in flight', () => {
    component.formData = validForm() as any;
    component.isSubmitting = true;
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector('.cf-split-form-actions button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);

    component.onSubmit();
    expect(tenantService.createTenant).not.toHaveBeenCalled();
  });

  it('clears a previous plan selection on reset', () => {
    subscriptionAdmin.listPlans.mockReturnValue(of(catalogPlans));
    component.loadPlans();
    component.choosePlan(catalogPlans[1]);
    expect(component.selectedPlanKey).toBe('standard');

    component.resetForm();
    expect(component.selectedPlanKey).toBe('starter');
  });

  it('resetForm clears plan load errors', () => {
    component.plansLoadError = 'Unable to load plans.';
    component.resetForm();
    expect(component.plansLoadError).toBe('');
  });
});
