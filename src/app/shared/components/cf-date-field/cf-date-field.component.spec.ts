import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { CfDateFieldComponent } from './cf-date-field.component';

describe('CfDateFieldComponent', () => {
  let fixture: ComponentFixture<CfDateFieldComponent>;
  let component: CfDateFieldComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CfDateFieldComponent, ReactiveFormsModule, OverlayModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CfDateFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('formats ISO to DD/MM/YYYY on write', () => {
    component.writeValue('2026-10-21');
    expect(component.displayText).toBe('21/10/2026');
  });

  it('emits ISO when valid text entered', () => {
    const values: string[] = [];
    component.registerOnChange((v) => values.push(v));
    component.onTextInput({ target: { value: '05/03/2026' } } as unknown as Event);
    expect(values.at(-1)).toBe('2026-03-05');
  });
});
