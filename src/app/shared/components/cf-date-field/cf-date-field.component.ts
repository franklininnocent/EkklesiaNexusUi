import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  CF_DATE_INPUT_PLACEHOLDER,
  formatDateInput,
  normalizeIsoDateInput,
  parseDateInputToIso,
} from '@shared/utils/cf-date-input.util';
import { CfDateCalendarPanelComponent } from '../cf-date-calendar-panel/cf-date-calendar-panel.component';

@Component({
  selector: 'app-cf-date-field',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './cf-date-field.component.html',
  styleUrl: './cf-date-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CfDateFieldComponent),
      multi: true,
    },
  ],
})
export class CfDateFieldComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly overlay = inject(Overlay);
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() inputId = '';
  @Input() ariaLabel = 'Date';
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() invalid = false;
  @Input() disabled = false;
  @Input({ alias: 'readonly' }) readOnly = false;
  @Input() placeholder = CF_DATE_INPUT_PLACEHOLDER;

  @ViewChild('textInput') textInput?: ElementRef<HTMLInputElement>;

  displayText = '';
  inputInvalid = false;
  calendarOpen = false;

  private canonicalIso = '';
  private overlayRef: OverlayRef | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.canonicalIso = normalizeIsoDateInput(value);
    this.displayText = this.canonicalIso ? formatDateInput(this.canonicalIso) : '';
    this.inputInvalid = false;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.closeCalendar();
    }
    this.cdr.markForCheck();
  }

  onTextInput(event: Event): void {
    if (this.readOnly) {
      return;
    }
    const target = event.target as HTMLInputElement;
    this.displayText = target.value;
    const iso = parseDateInputToIso(this.displayText);
    if (this.displayText.trim() === '') {
      this.inputInvalid = false;
      this.commitIso('');
      return;
    }
    if (iso) {
      this.inputInvalid = false;
      this.commitIso(iso);
      return;
    }
    if (this.displayText.length >= 10) {
      this.inputInvalid = true;
    }
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this.onTouched();
    const iso = parseDateInputToIso(this.displayText);
    if (this.displayText.trim() === '') {
      this.inputInvalid = false;
      this.commitIso('');
      return;
    }
    if (iso) {
      this.inputInvalid = false;
      this.commitIso(iso);
      return;
    }
    this.inputInvalid = true;
    this.displayText = this.canonicalIso ? formatDateInput(this.canonicalIso) : '';
    this.cdr.markForCheck();
  }

  toggleCalendar(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    if (this.calendarOpen) {
      this.closeCalendar();
      return;
    }
    this.openCalendar();
  }

  clear(event: Event): void {
    event.preventDefault();
    if (this.disabled) {
      return;
    }
    this.displayText = '';
    this.inputInvalid = false;
    this.commitIso('');
    this.onTouched();
    this.closeCalendar();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.calendarOpen) {
      this.closeCalendar();
    }
  }

  private commitIso(iso: string): void {
    this.canonicalIso = iso;
    if (iso) {
      this.displayText = formatDateInput(iso);
    }
    this.onChange(iso);
    this.cdr.markForCheck();
  }

  private openCalendar(): void {
    const origin = this.host.nativeElement.querySelector('.cf-date-field__input-wrap') as HTMLElement;
    if (!origin) {
      return;
    }
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cf-date-field-backdrop',
    });

    const portal = new ComponentPortal(CfDateCalendarPanelComponent);
    const ref = this.overlayRef.attach(portal);
    ref.instance.selectedIso = this.canonicalIso || null;
    ref.instance.min = this.min;
    ref.instance.max = this.max;
    ref.instance.dateSelect.subscribe((iso) => {
      this.inputInvalid = false;
      this.commitIso(iso);
      this.onTouched();
      this.closeCalendar();
      this.textInput?.nativeElement.focus();
    });

    this.overlayRef.backdropClick().subscribe(() => this.closeCalendar());
    this.calendarOpen = true;
    this.cdr.markForCheck();
  }

  private closeCalendar(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.calendarOpen = false;
    this.cdr.markForCheck();
  }
}
