import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LeadershipRoleComboboxComponent } from './leadership-role-combobox.component';
import { ChurchLeadershipGovernanceService } from '@core/services/church/church-leadership-governance.service';
import { ToastService } from '@core/services/toast.service';
import { LeadershipRoleOption } from '@core/models/church/leadership-governance.model';

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

describe('LeadershipRoleComboboxComponent', () => {
  let component: LeadershipRoleComboboxComponent;
  let fixture: ComponentFixture<LeadershipRoleComboboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadershipRoleComboboxComponent],
      providers: [
        {
          provide: ChurchLeadershipGovernanceService,
          useValue: {
            createRole: jest.fn(() => of({ success: true, data: pastorRole })),
            listRoles: jest.fn(() => of({ success: true, data: [pastorRole] })),
          },
        },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeadershipRoleComboboxComponent);
    component = fixture.componentInstance;
    component.roles = [pastorRole];
    component.canCreate = true;
    component.categoryFilter = 'PARISH_CLERGY';
    component.defaultCreateCategory = 'PARISH_CLERGY';
    fixture.detectChanges();
  });

  it('shows + Add New Role at the end of the dropdown', () => {
    component.openPanel();
    fixture.detectChanges();

    const addButton = Array.from(
      fixture.nativeElement.querySelectorAll('.lrc__create') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('+ Add New Role'));

    expect(addButton).toBeTruthy();
  });

  it('hides + Add New Role when the user cannot create roles', () => {
    component.canCreate = false;
    component.openPanel();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('+ Add New Role');
  });

  it('requests Add New Role without changing the selected role', () => {
    const requested = jest.fn();
    component.addNewRoleRequested.subscribe(requested);
    component.writeValue(pastorRole.id);
    component.searchQuery = 'Chapel Chaplain';
    component.openAddNewRoleModal();

    expect(component.value).toBe(pastorRole.id);
    expect(requested).toHaveBeenCalledWith({
      initialName: 'Chapel Chaplain',
      category: 'PARISH_CLERGY',
    });
    expect(component.panelOpen).toBe(false);
  });
});
