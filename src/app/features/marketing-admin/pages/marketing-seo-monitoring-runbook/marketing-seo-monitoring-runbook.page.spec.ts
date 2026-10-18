import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MarketingSeoMonitoringRunbookPage } from './marketing-seo-monitoring-runbook.page';

describe('MarketingSeoMonitoringRunbookPage', () => {
  let fixture: ComponentFixture<MarketingSeoMonitoringRunbookPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingSeoMonitoringRunbookPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketingSeoMonitoringRunbookPage);
    fixture.detectChanges();
  });

  it('shows SEO monitoring runbook title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('SEO monitoring runbook');
  });

  it('links to Search Console', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('a[href="https://search.google.com/search-console/"]');
    expect(link).toBeTruthy();
  });
});
