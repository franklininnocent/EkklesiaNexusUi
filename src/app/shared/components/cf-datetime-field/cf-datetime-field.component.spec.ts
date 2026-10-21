import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { CfDateTimeFieldComponent } from './cf-datetime-field.component';

describe('CfDateTimeFieldComponent', () => {
  let fixture: ComponentFixture<CfDateTimeFieldComponent>;
  let component: CfDateTimeFieldComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CfDateTimeFieldComponent, ReactiveFormsModule, OverlayModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CfDateTimeFieldComponent);
    component = fixture.componentInstance;
    component.dateInputId = 'test-date';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('writes and emits combined datetime values', () => {
    const control = new FormControl('');
    component.registerOnChange((value) => control.setValue(value));

    component.writeValue('2026-09-10T10:00');
    expect(component.dateIso).toBe('2026-09-10');
    expect(component.dateDisplay).toBe('10/09/2026');
    expect(component.timeValue).toBe('10:00');

    component.onDateTextInput({ target: { value: '10/09/2026' } } as unknown as Event);
    component.onTimeInput({ target: { value: '12:30' } } as unknown as Event);

    expect(control.value).toBe('2026-09-10T12:30');
  });

  it('clears date and time', () => {
    const changes: string[] = [];
    component.registerOnChange((value) => changes.push(value));
    component.writeValue('2026-09-10T10:00');

    component.clear();

    expect(component.dateIso).toBe('');
    expect(component.timeValue).toBe('');
    expect(changes.at(-1)).toBe('');
  });

  it('renders date text and time inputs', () => {
    const dateInput = fixture.nativeElement.querySelector('.cf-datetime-field__date input[type="text"]');
    const timeInput = fixture.nativeElement.querySelector('input[type="time"]');
    expect(dateInput).toBeTruthy();
    expect(timeInput).toBeTruthy();
  });

  it('applies min date and time constraints', () => {
    component.minDateTime = '2026-09-10T10:00';
    component.dateIso = '2026-09-10';
    component.ngOnChanges({
      minDateTime: {
        currentValue: '2026-09-10T10:00',
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    fixture.detectChanges();

    expect(component.minDate).toBe('2026-09-10');
    expect(component.minTime).toBe('10:00');
  });
});
