import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MarketingSeoMonitoringPage } from './marketing-seo-monitoring-runbook.page';
import { environment } from '@environments/environment';

describe('MarketingSeoMonitoringPage', () => {
  let fixture: ComponentFixture<MarketingSeoMonitoringPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingSeoMonitoringPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketingSeoMonitoringPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/marketing/seo-monitoring/snapshot`).flush({
      success: true,
      message: 'OK',
      data: {
        schema_version: 1,
        snapshot_label: 'latest_snapshot',
        domain: 'https://ekklesianexus.com',
        config_fingerprint: 'abc',
        published_content_fingerprint: null,
        cms: null,
        production: { never_run: true, checks: [], findings: [] },
        last_failed_attempt: null,
        snapshot_unavailable: true,
      },
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('shows SEO Monitoring title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('SEO Monitoring');
  });

  it('defaults production opt-in to unchecked', () => {
    expect(fixture.componentInstance.includeProduction).toBe(false);
  });

  it('links to Search Console', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('a[href="https://search.google.com/search-console/"]');
    expect(link).toBeTruthy();
  });

  it('posts include_production when scanning', () => {
    fixture.componentInstance.includeProduction = true;
    fixture.componentInstance.runScan();
    const req = http.expectOne(`${environment.apiUrl}/admin/marketing/seo-monitoring/scans`);
    expect(req.request.body).toEqual({ include_production: true });
    req.flush({
      success: true,
      message: 'OK',
      data: {
        scan_id: '1',
        scan_kind: 'cms_and_production',
        status: 'completed',
        started_at: '2026-10-18T00:00:00Z',
        completed_at: '2026-10-18T00:00:01Z',
        include_production: true,
        checks: [],
        findings: [],
        summary: {
          cms: { passed: 0, failed: 0, not_run: 0, error: 0 },
          production_http: { passed: 0, failed: 0, not_run: 0, error: 0 },
          open_findings_by_severity: { critical: 0, warning: 0, info: 0 },
        },
      },
    });
    http.expectOne(`${environment.apiUrl}/admin/marketing/seo-monitoring/snapshot`).flush({
      success: true,
      message: 'OK',
      data: {
        schema_version: 1,
        snapshot_label: 'latest_snapshot',
        domain: 'https://ekklesianexus.com',
        config_fingerprint: 'abc',
        published_content_fingerprint: 'fp',
        cms: {
          last_successful_scan_at: '2026-10-18T00:00:01Z',
          checks: [],
          findings: [],
          summary: {
            cms: { passed: 1, failed: 0, not_run: 0, error: 0 },
            production_http: { passed: 0, failed: 0, not_run: 0, error: 0 },
            open_findings_by_severity: { critical: 0, warning: 0, info: 0 },
          },
        },
        production: { never_run: true, checks: [], findings: [] },
        last_failed_attempt: null,
        snapshot_unavailable: false,
      },
    });
  });
});
