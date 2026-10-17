import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WebSettingsApiService } from './web-settings.service';
import { environment } from '@environments/environment';

describe('WebSettingsApiService', () => {
  let api: WebSettingsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    api = TestBed.inject(WebSettingsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads web settings from the admin API', () => {
    let result: unknown;
    api.getSettings().subscribe((data) => (result = data));
    const req = http.expectOne(`${environment.apiUrl}/admin/web-settings`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      data: {
        contact_recipient_email: 'ops@example.com',
        contact_form_enabled: true,
        captcha_enabled: true,
        captcha_ttl_seconds: 300,
        enquiry_retention_days: 730,
      },
    });
    expect(result).toEqual(expect.objectContaining({ contact_recipient_email: 'ops@example.com' }));
  });

  it('loads a single enquiry detail', () => {
    let result: unknown;
    api.getEnquiry('11111111-1111-4111-8111-111111111111').subscribe((data) => (result = data));
    const req = http.expectOne(`${environment.apiUrl}/admin/contact-enquiries/11111111-1111-4111-8111-111111111111`);
    req.flush({
      success: true,
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        organisation: 'St Mary Parish',
        subject: 'Demo request',
        message: 'Please contact us.',
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        organisation: 'St Mary Parish',
        subject: 'Demo request',
        message: 'Please contact us.',
      }),
    );
  });

  it('lists enquiries with query params', () => {
    api.listEnquiries({ search: 'alpha', page: 2 }).subscribe((result) => {
      expect(result.rows.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
    const req = http.expectOne(
      (r) => r.url === `${environment.apiUrl}/admin/contact-enquiries` && r.params.get('search') === 'alpha',
    );
    req.flush({
      success: true,
      data: [{ id: '1', reference_number: 'ENQ-1', full_name: 'Alpha' }],
      meta: { current_page: 2, per_page: 20, total: 1, last_page: 1 },
    });
  });
});
