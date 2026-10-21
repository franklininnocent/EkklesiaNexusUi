import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MassCelebrationsViewNavComponent } from './mass-celebrations-view-nav.component';

describe('MassCelebrationsViewNavComponent', () => {
  let fixture: ComponentFixture<MassCelebrationsViewNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MassCelebrationsViewNavComponent, FormsModule, OverlayModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MassCelebrationsViewNavComponent);
    fixture.componentRef.setInput('view', 'list');
    fixture.componentRef.setInput('periodLabel', 'October 2026');
    fixture.componentRef.setInput('monthKey', '2026-10');
    fixture.componentRef.setInput('weekSunday', '2026-10-19');
    fixture.componentRef.setInput('canScheduleMass', false);
    fixture.detectChanges();
  });

  it('renders month picker in list view', () => {
    expect(fixture.nativeElement.querySelector('app-cf-month-field')).toBeTruthy();
  });
});
