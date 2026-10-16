import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LeadershipAddRoleModalComponent } from './leadership-add-role-modal.component';
import { ChurchLeadershipGovernanceService } from '@core/services/church/church-leadership-governance.service';
import { ToastService } from '@core/services/toast.service';
import { LeadershipRoleOption } from '@core/models/church/leadership-governance.model';
import { CfOverlayStackService } from '@core/services/cf-overlay-stack.service';

const pastorRole: LeadershipRoleOption = {
  id: 'role-pastor-uuid',
  title: 'Pastor',
  category: 'PARISH_CLERGY',
  category_label: 'Parish Clergy',
  hierarchical_level: 1,
  allows_concurrent: false,
  is_canonical_mandate: true,
  is_global: true,
};

const createdRole: LeadershipRoleOption = {
  id: 'role-custom-uuid',
  title: 'Associate Parish Priest',
  category: 'PARISH_CLERGY',
  category_label: 'Parish Clergy',
  hierarchical_level: 4,
  allows_concurrent: true,
  is_canonical_mandate: false,
  is_global: false,
};

describe('LeadershipAddRoleModalComponent', () => {
  let component: LeadershipAddRoleModalComponent;
  let fixture: ComponentFixture<LeadershipAddRoleModalComponent>;
  let api: { createRole: jest.Mock; listRoles: jest.Mock };

  beforeEach(async () => {
    api = {
      createRole: jest.fn(() => of({ success: true, data: createdRole })),
      listRoles: jest.fn(() => of({ success: true, data: [pastorRole, createdRole] })),
    };

    await TestBed.configureTestingModule({
      imports: [LeadershipAddRoleModalComponent],
      providers: [
        { provide: ChurchLeadershipGovernanceService, useValue: api },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } },
      ],
    }).compileComponents();

    TestBed.inject(CfOverlayStackService).reset();
    fixture = TestBed.createComponent(LeadershipAddRoleModalComponent);
    component = fixture.componentInstance;
    component.existingRoles = [pastorRole];
    component.defaultCategory = 'PARISH_CLERGY';
    component.nested = true;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(CfOverlayStackService).reset();
  });

  it('rejects an empty role name', () => {
    component.roleName = '   ';
    component.save();
    fixture.detectChanges();

    expect(component.error).toBe('Role name is required.');
    expect(api.createRole).not.toHaveBeenCalled();
  });

  it('emits an existing role instead of creating a duplicate', () => {
    const created = jest.fn();
    const closed = jest.fn();
    component.created.subscribe(created);
    component.closed.subscribe(closed);
    component.roleName = 'Pastor';
    component.save();

    expect(api.createRole).not.toHaveBeenCalled();
    expect(created).toHaveBeenCalledWith(pastorRole);
    expect(closed).toHaveBeenCalled();
  });

  it('saves a new role through the backend', fakeAsync(() => {
    const created = jest.fn();
    component.created.subscribe(created);
    component.roleName = 'Associate Parish Priest';
    component.save();
    tick();

    expect(api.createRole).toHaveBeenCalledWith({
      title: 'Associate Parish Priest',
      category: 'PARISH_CLERGY',
    });
    expect(created).toHaveBeenCalledWith(createdRole);
  }));

  it('keeps entered role name when the API fails', fakeAsync(() => {
    api.createRole.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'Could not create custom role.' } })),
    );
    component.roleName = 'Associate Parish Priest';
    component.save();
    tick();

    expect(component.roleName).toBe('Associate Parish Priest');
    expect(component.error).toBe('Could not create custom role.');
  }));

  it('does not submit a second create while a request is in flight', () => {
    component.roleName = 'Associate Parish Priest';
    component.creating = true;
    component.save();

    expect(api.createRole).not.toHaveBeenCalled();
  });
});
