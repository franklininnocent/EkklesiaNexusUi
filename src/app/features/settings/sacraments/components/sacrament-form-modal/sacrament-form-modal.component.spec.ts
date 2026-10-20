import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, Subject, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { SacramentFormModalComponent } from './sacrament-form-modal.component';
import { SacramentService } from '../../services/sacrament.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { TenantService } from '@core/services/tenant.service';
import { BCCService } from '@core/services/bcc.service';
import { FamilyService } from '@core/services/family.service';
import { ChurchLeadershipService } from '@core/services/church/church-leadership.service';
import { SacramentDefinitionService } from '../../services/sacrament-definition.service';
import { ParishPersonService } from '../../services/person.service';
import { SacramentPersonContextService } from '../../services/sacrament-person-context.service';
import { selectCurrentUser } from '@core/store/auth/auth.selectors';

describe('SacramentFormModalComponent', () => {
  let component: SacramentFormModalComponent;
  let fixture: ComponentFixture<SacramentFormModalComponent>;
  let store: MockStore;

  const sacramentTypes = [
    { id: 1, name: 'Baptism', code: 'BAPTISM' },
    { id: 2, name: 'Confirmation', code: 'CONFIRMATION' },
    { id: 3, name: 'Marriage', code: 'MARRIAGE' },
    { id: 4, name: 'Eucharist', code: 'EUCHARIST' }
  ];

  const sacramentServiceStub = {
    getSacramentTypes: jasmine.createSpy('getSacramentTypes').and.returnValue(of({ success: true, data: sacramentTypes })),
    createSacrament: jasmine.createSpy('createSacrament').and.returnValue(of({ success: true })),
    updateSacrament: jasmine.createSpy('updateSacrament').and.returnValue(of({ success: true }))
  } as unknown as SacramentService;

  const toastStub = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error')
  } as unknown as ToastService;

  const tenantStub = {
    getChurchProfile: jasmine.createSpy('getChurchProfile').and.returnValue(of({
      success: true,
      data: { name: 'St. Mary Parish' }
    }))
  } as unknown as TenantService;

  const leadershipStub = {
    getLeaders: jasmine.createSpy('getLeaders').and.returnValue(of({ success: true, data: [] }))
  };

  const bccStub = {
    getBCCs: jasmine.createSpy('getBCCs').and.returnValue(of({ success: true, data: [] }))
  };

  const familyStub = {
    getFamilies: jasmine.createSpy('getFamilies').and.returnValue(of({ success: true, data: [] })),
    getFamiliesByBCC: jasmine.createSpy('getFamiliesByBCC').and.returnValue(of({ success: true, data: [] })),
    getFamilyMembers: jasmine.createSpy('getFamilyMembers').and.returnValue(of({ success: true, data: [] }))
  };

  const personStub = {
    search: jasmine.createSpy('search').and.returnValue(of({ success: true, data: [] })),
    get: jasmine.createSpy('get').and.returnValue(of({ success: true, data: {} })),
    matches: jasmine.createSpy('matches').and.returnValue(of({ success: true, data: [] }))
  };

  const definitionStub = {
    load: jasmine.createSpy('load').and.returnValue(of({
      success: true,
      data: [{
        code: 'BAPTISM',
        workflow: 'progressive',
        batch_supported: true,
        privacy_class: 'standard',
        certificate_supported: true,
        review_required: false,
        minister_roles: ['priest'],
        participants: [],
        fields: { minimum: [], recommended: [], complete: [] }
      }],
      meta: { participants_v1: true }
    })),
    getByCode: jasmine.createSpy('getByCode').and.returnValue(of({
      code: 'BAPTISM',
      workflow: 'progressive',
      batch_supported: true,
      privacy_class: 'standard',
      certificate_supported: true,
      review_required: false,
      minister_roles: ['priest'],
      participants: [],
      fields: { minimum: [], recommended: [], complete: [] }
    })),
    isParticipantsV1Enabled: () => true,
    clearCache: () => undefined
  } as unknown as SacramentDefinitionService;

  const contextStub = {
    getContext: jasmine.createSpy('getContext').and.returnValue(of({
      subject: { family_member_id: 'm1', display_name: 'John Connor' },
      canonical_identity: {
        name: { value: 'John Connor', field_state: 'CANONICAL', provenance: {} },
        date_of_birth: { value: '2000-03-01', field_state: 'CANONICAL', provenance: {} },
        gender: { value: 'male', field_state: 'CANONICAL', provenance: {} },
        father_name: { value: 'Henry', field_state: 'CANONICAL', provenance: {} },
        mother_name: { value: 'Emily', field_state: 'CANONICAL', provenance: {} },
      },
      family: { record_status: 'FOUND' },
      parish: { record_status: 'FOUND' },
      sacraments: {
        baptism: { record_status: 'FOUND', candidates: [], evidence: { sacrament_id: 1, date: { value: '2000-06-12' } } },
        confirmation: { record_status: 'NOT_FOUND', candidates: [] },
        marriage_history: { record_status: 'NOT_FOUND', records: [] },
      },
      derived: { baptismal_status: { value: 'baptized_catholic', field_state: 'DERIVED', provenance: {} } },
      fields: { baptismal_status: { input_hidden: true, auto_resolved: true } },
      conflicts: [],
      has_blocking_conflicts: false,
      missing: [],
      found_summary: ['member', 'baptism'],
      record_status: { baptism: 'FOUND', confirmation: 'NOT_FOUND' },
    })),
    reconcileIdentity: jasmine.createSpy('reconcileIdentity').and.returnValue(of({ id: 'p1' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SacramentFormModalComponent],
      providers: [
        { provide: SacramentService, useValue: sacramentServiceStub },
        { provide: ToastService, useValue: toastStub },
        { provide: TenantService, useValue: tenantStub },
        { provide: ChurchLeadershipService, useValue: leadershipStub },
        { provide: BCCService, useValue: bccStub },
        { provide: FamilyService, useValue: familyStub },
        { provide: ParishPersonService, useValue: personStub },
        { provide: SacramentDefinitionService, useValue: definitionStub },
        { provide: SacramentPersonContextService, useValue: contextStub },
        { provide: AuthService, useValue: { hasPermission: () => true } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        provideMockStore({ initialState: {} })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentUser, { id: 1, tenant_id: 10 } as any);

    fixture = TestBed.createComponent(SacramentFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load sacrament types on init', () => {
    expect((sacramentServiceStub.getSacramentTypes as any)).toHaveBeenCalledWith({ includeInactive: false });
    expect(component.sacramentTypes.length).toBe(4);
  });

  it('omits tenant-inactive types from the create selector', () => {
    const spy = sacramentServiceStub.getSacramentTypes as any;
    spy.and.returnValue(of({
      success: true,
      data: [
        { id: 1, name: 'Baptism', code: 'BAPTISM', enabled_for_tenant: true },
        { id: 3, name: 'Marriage', code: 'MARRIAGE', enabled_for_tenant: false },
      ]
    }));
    component.isEditMode = false;
    component.loadSacramentTypes();
    expect(component.sacramentTypes.map((type) => type.id)).toEqual([1]);
    expect(component.showNoActiveSacramentsMessage).toBe(false);
    spy.and.returnValue(of({ success: true, data: sacramentTypes }));
    component.loadSacramentTypes();
  });

  it('shows an empty message when this church has no active sacraments', () => {
    const spy = sacramentServiceStub.getSacramentTypes as any;
    spy.and.returnValue(of({
      success: true,
      data: [
        { id: 3, name: 'Marriage', code: 'MARRIAGE', enabled_for_tenant: false },
      ]
    }));
    component.isEditMode = false;
    component.loadSacramentTypes();
    expect(component.sacramentTypes).toEqual([]);
    expect(component.showNoActiveSacramentsMessage).toBe(true);
    expect(component.canSelectSacramentType).toBe(false);
    expect(component.canSubmitSacrament).toBe(false);
    spy.and.returnValue(of({ success: true, data: sacramentTypes }));
    component.loadSacramentTypes();
  });

  it('keeps the current type when editing a historical inactive sacrament', () => {
    const spy = sacramentServiceStub.getSacramentTypes as any;
    spy.and.returnValue(of({
      success: true,
      data: [
        { id: 1, name: 'Baptism', code: 'BAPTISM', enabled_for_tenant: true },
        { id: 3, name: 'Marriage', code: 'MARRIAGE', enabled_for_tenant: false },
      ]
    }));
    component.isEditMode = true;
    component.sacrament = { id: 9, sacrament_type_id: 3 } as any;
    component.loadSacramentTypes();
    expect(component.sacramentTypes.map((type) => type.id)).toEqual([1, 3]);
    expect(component.showNoActiveSacramentsMessage).toBe(false);
    spy.and.returnValue(of({ success: true, data: sacramentTypes }));
    component.loadSacramentTypes();
  });

  it('surfaces a retryable error when sacrament types fail to load', () => {
    const spy = sacramentServiceStub.getSacramentTypes as any;
    spy.and.returnValue(throwError(() => new Error('network')));
    component.loadSacramentTypes();
    expect(component.sacramentTypesError).toBeTruthy();
    expect(component.canSelectSacramentType).toBe(false);
    expect((toastStub.error as any)).toHaveBeenCalled();
    spy.and.returnValue(of({ success: true, data: sacramentTypes }));
    component.loadSacramentTypes();
    expect(component.sacramentTypesError).toBeNull();
    expect(component.sacramentTypes.length).toBe(4);
  });

  it('requiresParents should apply to Baptism and Eucharist', () => {
    component.formData['sacrament_type_id'] = 1; // Baptism
    expect(component.requiresParents()).toBe(true);
    component.formData['sacrament_type_id'] = 4; // Eucharist
    expect(component.requiresParents()).toBe(true);
    component.formData['sacrament_type_id'] = 3; // Marriage
    expect(component.requiresParents()).toBe(false);
  });

  it('requiresGodparents should depend on types BAPTISM and CONFIRMATION', () => {
    component.formData['sacrament_type_id'] = 1; // Baptism
    expect(component.requiresGodparents()).toBe(true);
    component.formData['sacrament_type_id'] = 2; // Confirmation
    expect(component.requiresGodparents()).toBe(true);
    component.formData['sacrament_type_id'] = 3; // Marriage
    expect(component.requiresGodparents()).toBe(false);
  });

  it('validateForm should enforce required fields', () => {
    component.formData = { sacrament_type_id: undefined, recipient_name: '', date_administered: '' } as any;
    expect(component.validateForm()).toBe(false);
    expect((toastStub.error as any)).toHaveBeenCalled();

    component.formData = { sacrament_type_id: 1, recipient_name: '', date_administered: '' } as any;
    expect(component.validateForm()).toBe(false);

    component.formData = { sacrament_type_id: 1, recipient_name: 'John', date_administered: '' } as any;
    expect(component.validateForm()).toBe(false);

    // Baptism requires minister plus place, DOB, birth place, gender, and parents
    component.formData = {
      sacrament_type_id: 1,
      recipient_name: 'John',
      date_administered: '2025-01-01',
      minister_name: 'Fr. Thomas'
    } as any;
    expect(component.validateForm()).toBe(false);

    component.formData = {
      sacrament_type_id: 1,
      recipient_name: 'John',
      date_administered: '2025-01-01',
      minister_name: 'Fr. Thomas',
      place_administered: 'St. Mary',
      recipient_birth_date: '2015-01-01',
      recipient_birth_place: 'Parish City',
      recipient_gender: 'male',
      father_name: 'Joseph',
      mother_name: 'Mary'
    } as any;
    expect(component.validateForm()).toBe(true);

    component.formData = { sacrament_type_id: 2, recipient_name: 'John', date_administered: '2025-01-01' } as any;
    expect(component.validateForm()).toBe(true);

    component.formData = {
      sacrament_type_id: 3,
      date_administered: '2025-06-15',
      minister_name: 'Fr. Thomas',
      marriage_bride_full_name: 'Jane Bride',
      marriage_groom_full_name: 'John Groom'
    } as any;
    component.brideDraft = { role: 'bride', source: 'external', external_full_name: 'Jane Bride' } as any;
    component.groomDraft = { role: 'groom', source: 'external', external_full_name: 'John Groom' } as any;
    expect(component.validateForm()).toBe(false);

    component.formData['place_administered'] = 'St. Mary';
    component.brideDraft = {
      role: 'bride',
      source: 'external',
      external_full_name: 'Jane Bride',
      external_date_of_birth: '1990-01-01',
      external_gender: 'female'
    } as any;
    component.groomDraft = {
      role: 'groom',
      source: 'external',
      external_full_name: 'John Groom',
      external_date_of_birth: '1988-02-02',
      external_gender: 'male'
    } as any;
    expect(component.validateForm()).toBe(true);
  });

  it('should require marriage witness name, address, gender, and contact but not date of birth', () => {
    component.formData = {
      sacrament_type_id: 3,
      date_administered: '2025-06-15',
      place_administered: 'St. Mary',
      minister_name: 'Fr. Thomas'
    } as any;
    component.brideDraft = {
      role: 'bride',
      source: 'external',
      external_full_name: 'Jane Bride',
      external_date_of_birth: '1990-01-01',
      external_gender: 'female'
    } as any;
    component.groomDraft = {
      role: 'groom',
      source: 'external',
      external_full_name: 'John Groom',
      external_date_of_birth: '1988-02-02',
      external_gender: 'male'
    } as any;
    component.ministerDraft = {
      role: 'minister',
      source: 'external',
      external_full_name: 'Fr. Thomas'
    } as any;

    component.witnessDrafts = [{ role: 'witness', source: 'external' } as any];
    expect(component.validateForm()).toBe(true);

    component.witnessDrafts = [{
      role: 'witness',
      source: 'external',
      external_full_name: 'Pat Witness'
    } as any];
    expect(component.validateForm()).toBe(false);
    expect(component.fieldErrors['witness_0']).toContain('address');
    expect(component.fieldErrors['witness_0']).toContain('gender');
    expect(component.fieldErrors['witness_0']).toContain('contact number');
    expect(component.fieldErrors['witness_0']).not.toContain('date of birth');

    component.witnessDrafts = [{
      role: 'witness',
      source: 'external',
      external_full_name: 'Pat Witness',
      external_address: '12 Oak Lane',
      external_gender: 'female',
      external_contact_number: '5550100'
    } as any];
    expect(component.validateForm()).toBe(true);
  });

  it('should call create on save when not in edit mode', () => {
    component.isEditMode = false;
    component.currentTenantId = 10;
    component.formData = {
      sacrament_type_id: 2,
      recipient_name: 'Jane',
      date_administered: '2025-01-01'
    } as any;
    component.onSave();
    expect((sacramentServiceStub.createSacrament as any)).toHaveBeenCalled();
  });

  it('should call update on save when in edit mode', () => {
    component.isEditMode = true;
    component.sacrament = { id: 77 } as any;
    component.currentTenantId = 10;
    component.formData = { sacrament_type_id: 2, recipient_name: 'Paul', date_administered: '2025-01-02' } as any;
    component.onSave();
    expect((sacramentServiceStub.updateSacrament as any)).toHaveBeenCalledWith(77, jasmine.any(Object));
  });

  it('classifies mixed marriage and requires a permission on the register', () => {
    component.brideDraft = { baptismal_status: 'baptized_catholic' } as any;
    component.groomDraft = { baptismal_status: 'baptized_non_catholic' } as any;
    expect(component.marriageClassificationCode).toBe('mixed_marriage');
    expect(component.marriageRequiresDispensation).toBe(true);
    expect(component.marriageClassificationLabel).toContain('permission');

    component.groomDraft = { baptismal_status: 'baptized_catholic' } as any;
    expect(component.marriageClassificationCode).toBe('both_catholic');
    expect(component.marriageRequiresDispensation).toBe(false);
  });

  it('validateForm requires new person fields for baptism in existing family', () => {
    component.isEditMode = false;
    component.formData = {
      sacrament_type_id: 1,
      recipient_name: 'Grace Thomas',
      date_administered: '2026-09-01',
      place_administered: 'St. Mary',
      recipient_birth_date: '2026-03-15',
      recipient_birth_place: 'Parish City',
      recipient_gender: 'female',
      father_name: 'Joseph Thomas',
      mother_name: 'Mary Thomas',
    } as any;
    component.familySelectionType = 'existing';
    component.selectedFamilyId = 'family-uuid';
    component.existingFamilyRecipientMode = 'new_person';
    component.ministerDraft = {
      role: 'minister',
      source: 'external',
      external_full_name: 'Fr. Thomas',
    } as any;

    expect(component.validateForm()).toBe(false);
    expect(component.fieldErrors['person_first_name']).toBeTruthy();
    expect(component.fieldErrors['person_last_name']).toBeTruthy();

    component.personDraft.first_name = 'Grace';
    component.personDraft.last_name = 'Thomas';
    expect(component.validateForm()).toBe(true);
  });

  function baptismFormReady(): void {
    component.formData = {
      sacrament_type_id: 1,
      recipient_name: 'John',
      date_administered: '2025-01-01',
      minister_name: 'Fr. Thomas',
      place_administered: 'St. Mary',
      recipient_birth_date: '2015-01-01',
      recipient_birth_place: 'Parish City',
      recipient_gender: 'male',
      father_name: 'Joseph',
      mother_name: 'Mary'
    } as any;
    component.ministerDraft = {
      role: 'minister',
      source: 'external',
      external_full_name: 'Fr. Thomas',
    } as any;
  }

  it('prefills profile-only baptism details and does not treat them as a register duplicate', () => {
    (contextStub.getContext as jasmine.Spy).and.returnValue(of({
      subject: { family_member_id: 'm1', display_name: 'John Connor' },
      sacraments: {
        baptism: {
          record_status: 'FOUND',
          register_record_status: 'NOT_FOUND',
          evidence_tier: 'MEMBER_PROFILE',
          candidates: [],
          evidence: {
            sacrament_id: null,
            date: { value: '2011-12-25' },
            baptism_location_type: 'other',
            baptism_church_name: 'Sacred Heart of Jesus Church Demo',
            baptism_godparent_primary: 'Felix A. Romo',
            baptism_godparent_secondary: 'Kristi D. Carr',
          }
        }
      },
      conflicts: [],
      record_status: { baptism: 'FOUND', baptism_register: 'NOT_FOUND' },
    }));
    component.formData['sacrament_type_id'] = 1;
    component.formData['place_administered'] = 'St. Mary Parish';
    component.homeParishDisplayName = 'St. Mary Parish';
    component.applyMemberAsRecipient({
      id: 'm1',
      first_name: 'John',
      last_name: 'Connor',
      baptism_date: '2011-12-25',
    } as any);

    expect(component.formData['date_administered']).toBe('2011-12-25');
    expect(component.formData['place_administered']).toBe('Sacred Heart of Jesus Church Demo');
    expect(component.formData['godparent1_name']).toBe('Felix A. Romo');
    expect(component.formData['godparent2_name']).toBe('Kristi D. Carr');
    expect(component.baptismRegisterBlocksCreate).toBe(false);
    expect(component.baptismEligibilityKind).toBe('profile');
    baptismFormReady();
    component.formData['date_administered'] = '2011-12-25';
    component.formData['place_administered'] = 'Sacred Heart of Jesus Church Demo';
    expect(component.validateForm()).toBe(true);
  });

  it('blocks create when a current-parish baptism register entry exists', () => {
    (contextStub.getContext as jasmine.Spy).and.returnValue(of({
      sacraments: {
        baptism: {
          record_status: 'FOUND',
          register_record_status: 'FOUND',
          evidence_tier: 'BAPTISM_RECORD',
          candidates: [],
          evidence: { sacrament_id: 44, date: { value: '2000-06-12' }, place: { value: 'St Mary' } }
        }
      },
      conflicts: [],
      record_status: { baptism: 'FOUND', baptism_register: 'FOUND' },
    }));
    component.formData['sacrament_type_id'] = 1;
    component.applyMemberAsRecipient({ id: 'm1', first_name: 'John', last_name: 'Connor' } as any);
    expect(component.baptismRegisterBlocksCreate).toBe(true);
    expect(component.existingRegisterId).toBe(44);
    baptismFormReady();
    expect(component.validateForm()).toBe(false);
    expect(component.fieldErrors['baptism_duplicate']).toBeTruthy();
  });

  it('does not silently pick a register when multiple candidates exist', () => {
    (contextStub.getContext as jasmine.Spy).and.returnValue(of({
      sacraments: {
        baptism: {
          record_status: 'MULTIPLE_CANDIDATES',
          register_record_status: 'MULTIPLE_CANDIDATES',
          candidates: [
            { sacrament_id: 1, date: { value: '2000-01-01' } },
            { sacrament_id: 2, date: { value: '2001-01-01' } },
          ],
          evidence: null
        }
      },
      conflicts: [],
      record_status: { baptism: 'MULTIPLE_CANDIDATES', baptism_register: 'MULTIPLE_CANDIDATES' },
    }));
    component.formData['sacrament_type_id'] = 1;
    component.applyMemberAsRecipient({ id: 'm1', first_name: 'John', last_name: 'Connor' } as any);
    expect(component.existingRegisterId).toBeNull();
    expect(component.baptismEligibilityKind).toBe('multiple');
    expect(component.baptismRegisterBlocksCreate).toBe(true);
  });

  it('blocks save and offers retry when context lookup fails', () => {
    (contextStub.getContext as jasmine.Spy).and.returnValue(throwError(() => new Error('network')));
    component.formData['sacrament_type_id'] = 1;
    component.applyMemberAsRecipient({ id: 'm1', first_name: 'John', last_name: 'Connor' } as any);
    expect(component.baptismEligibilityKind).toBe('lookup_failed');
    baptismFormReady();
    expect(component.validateForm()).toBe(false);
  });

  it('loads context when a resolved person is selected', () => {
    const spy = contextStub.getContext as unknown as jest.Mock;
    spy.mockClear();
    component.formData['sacrament_type_id'] = 1;
    component.selectResolvedPerson({
      id: 'person-1',
      first_name: 'Jane',
      last_name: 'Doe',
      date_of_birth: '2011-12-25',
    } as any);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ person_id: 'person-1', workflow: 'BAPTISM' }));
  });

  it('ignores a stale context response after the selected person changes', () => {
    const first$ = new Subject<any>();
    const second$ = new Subject<any>();
    const spy = contextStub.getContext as unknown as jest.Mock;
    spy.mockReset();
    spy.mockReturnValueOnce(first$.asObservable()).mockReturnValueOnce(second$.asObservable());
    component.formData['sacrament_type_id'] = 1;
    component.applyMemberAsRecipient({ id: 'm-old', first_name: 'Old', last_name: 'Person' } as any);
    component.applyMemberAsRecipient({ id: 'm-new', first_name: 'New', last_name: 'Person' } as any);

    first$.next({
      sacraments: {
        baptism: {
          record_status: 'FOUND',
          register_record_status: 'FOUND',
          evidence_tier: 'BAPTISM_RECORD',
          candidates: [],
          evidence: { sacrament_id: 99, date: { value: '1999-01-01' } }
        }
      },
      conflicts: [],
      record_status: { baptism: 'FOUND', baptism_register: 'FOUND' },
    });
    first$.complete();

    expect(component.existingRegisterId).toBeNull();

    second$.next({
      sacraments: {
        baptism: {
          record_status: 'NOT_FOUND',
          register_record_status: 'NOT_FOUND',
          evidence_tier: null,
          candidates: [],
          evidence: null
        }
      },
      conflicts: [],
      record_status: { baptism: 'NOT_FOUND', baptism_register: 'NOT_FOUND' },
    });
    second$.complete();

    expect(component.baptismEligibilityKind).toBe('none');
    expect(component.baptismRegisterBlocksCreate).toBe(false);
  });
});
