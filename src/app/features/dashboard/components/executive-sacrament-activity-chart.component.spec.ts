import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ExecutiveSacramentActivityChartComponent } from './executive-sacrament-activity-chart.component';

describe('ExecutiveSacramentActivityChartComponent', () => {
  let fixture: ComponentFixture<ExecutiveSacramentActivityChartComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutiveSacramentActivityChartComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExecutiveSacramentActivityChartComponent);
    router = TestBed.inject(Router);
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    fixture.componentInstance.slices = [
      { code: 'BAPTISM', label: 'Baptism', sacrament_type_id: 1, count: 8, percent: 80 },
      { code: 'MATRIMONY', label: 'Marriage', sacrament_type_id: 7, count: 2, percent: 20 },
    ];
    fixture.componentInstance.dateFrom = '2026-01-01';
    fixture.componentInstance.dateTo = '2026-10-02';
    fixture.detectChanges();
  });

  it('navigates to the register filtered by type and year-to-date dates', async () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const button = fixture.nativeElement.querySelector('.exec-sacrament-chart__legend-btn') as HTMLButtonElement;
    button.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/sacraments/register'], {
      queryParams: {
        sacrament_type_id: '1',
        date_from: '2026-01-01',
        date_to: '2026-10-02',
      },
    });
  });

  it('explains when only excluded types were recorded', () => {
    const emptyFixture = TestBed.createComponent(ExecutiveSacramentActivityChartComponent);
    emptyFixture.componentInstance.slices = [];
    emptyFixture.componentInstance.emptyReason = 'only_excluded_types';
    emptyFixture.detectChanges();

    expect(emptyFixture.nativeElement.textContent).toContain('Reconciliation or Anointing');
  });
});
