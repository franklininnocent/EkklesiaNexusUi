import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { OrganizationListPageComponent } from './organization-list.page';
import { MinistriesApiService } from '../services/ministries-api.service';
import { Organization } from '../models/ministries.model';

describe('OrganizationListPageComponent', () => {
  let fixture: ComponentFixture<OrganizationListPageComponent>;
  let component: OrganizationListPageComponent;
  let navigateByUrlSpy: jest.SpyInstance;

  const organization = {
    id: 'org-uuid-1',
    name: 'St. Vincent de Paul',
    code: 'SVDP',
    status: 'active',
    category: { id: 'c1', name: 'Ministry', slug: 'ministry' },
    type: { id: 't1', name: 'Outreach', slug: 'outreach' },
  } as unknown as Organization;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationListPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: MinistriesApiService,
          useValue: {
            listOrganizations: jest.fn(() =>
              of({
                success: true,
                data: [organization],
                meta: { total: 1, current_page: 1, per_page: 15, last_page: 1 },
              })
            ),
            listCategories: jest.fn(() => of({ success: true, data: [] })),
            listTypes: jest.fn(() => of({ success: true, data: [] })),
          },
        },
        {
          provide: AuthService,
          useValue: {
            hasPermission: jest.fn(() => true),
            canViewTenantAuditLogs: jest.fn(() => false),
          },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'url', { value: '/ministries', configurable: true });
    navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(OrganizationListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('navigates to organization detail when the name control is activated', () => {
    component.openOrganization(organization);
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/ministries/org-uuid-1');
  });

  it('does not render a separate view icon action in the table', () => {
    component.loaded = true;
    component.organizations = [organization];
    component.loadError = null;
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-cf-action-icon')).toBeNull();
    expect(root.querySelector('.organization-list__name')).not.toBeNull();
  });
});
