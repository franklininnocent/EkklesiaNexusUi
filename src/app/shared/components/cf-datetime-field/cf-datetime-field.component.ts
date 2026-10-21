import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  combineDateTime,
  formatDateTimeDisplay,
  minDateFromDateTime,
  minTimeForDate,
  splitDateTime,
} from '@core/utils/datetime.util';
import {
  CF_DATE_INPUT_PLACEHOLDER,
  formatDateInput,
  normalizeIsoDateInput,
  parseDateInputToIso,
} from '@shared/utils/cf-date-input.util';
import { CfDateCalendarPanelComponent } from '../cf-date-calendar-panel/cf-date-calendar-panel.component';

@Component({
  selector: 'app-cf-datetime-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OverlayModule],
  templateUrl: './cf-datetime-field.component.html',
  styleUrl: './cf-datetime-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CfDateTimeFieldComponent),
      multi: true,
    },
  ],
})
export class CfDateTimeFieldComponent implements ControlValueAccessor, OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly overlay = inject(Overlay);
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) dateInputId!: string;
  @Input() labelledById?: string;
  @Input() dateAriaLabel = 'Date';
  @Input() timeAriaLabel = 'Time';
  @Input() minDateTime: string | null = null;
  @Input() invalid = false;
  @Input() disabled = false;

  dateDisplay = '';
  dateIso = '';
  timeValue = '';
  minDate: string | null = null;
  minTime: string | null = null;
  displaySummary = '';
  dateInputInvalid = false;
  calendarOpen = false;
  readonly datePlaceholder = CF_DATE_INPUT_PLACEHOLDER;

  private overlayRef: OverlayRef | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['minDateTime'] || changes['dateIso']) {
      this.syncConstraints();
    }
  }

  writeValue(value: string | null): void {
    const parts = splitDateTime(value);
    this.dateIso = normalizeIsoDateInput(parts.date);
    this.dateDisplay = this.dateIso ? formatDateInput(this.dateIso) : '';
    this.timeValue = parts.time;
    this.dateInputInvalid = false;
    this.displaySummary = formatDateTimeDisplay(value);
    this.syncConstraints();
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

  onDateTextInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.dateDisplay = target.value;
    if (this.dateDisplay.trim() === '') {
      this.dateIso = '';
      this.dateInputInvalid = false;
      this.emitValue();
      return;
    }
    const iso = parseDateInputToIso(this.dateDisplay);
    if (iso) {
      this.dateIso = iso;
      this.dateInputInvalid = false;
      this.syncConstraints();
      this.emitValue();
      return;
    }
    if (this.dateDisplay.length >= 10) {
      this.dateInputInvalid = true;
    }
    this.cdr.markForCheck();
  }

  onDateBlur(): void {
    const iso = parseDateInputToIso(this.dateDisplay);
    if (this.dateDisplay.trim() === '') {
      this.dateIso = '';
      this.dateInputInvalid = false;
      this.emitValue();
      this.onTouched();
      return;
    }
    if (iso) {
      this.dateIso = iso;
      this.dateDisplay = formatDateInput(iso);
      this.dateInputInvalid = false;
      this.syncConstraints();
      this.emitValue();
    } else {
      this.dateInputInvalid = true;
      this.dateDisplay = this.dateIso ? formatDateInput(this.dateIso) : '';
    }
    this.onTouched();
    this.cdr.markForCheck();
  }

  onTimeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.timeValue = target.value;
    this.emitValue();
  }

  onBlur(): void {
    this.onTouched();
  }

  toggleDateCalendar(event: Event): void {
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.calendarOpen) {
      this.closeCalendar();
    }
  }

  clear(): void {
    if (this.disabled) {
      return;
    }
    this.dateDisplay = '';
    this.dateIso = '';
    this.timeValue = '';
    this.dateInputInvalid = false;
    this.syncConstraints();
    this.emitValue();
    this.onTouched();
    this.closeCalendar();
  }

  get timeInputId(): string {
    return `${this.dateInputId}-time`;
  }

  private emitValue(): void {
    const combined = combineDateTime(this.dateIso, this.timeValue);
    this.displaySummary = formatDateTimeDisplay(combined);
    this.onChange(combined);
    this.cdr.markForCheck();
  }

  private syncConstraints(): void {
    this.minDate = minDateFromDateTime(this.minDateTime);
    this.minTime = minTimeForDate(this.dateIso, this.minDateTime);
  }

  private openCalendar(): void {
    const origin = this.host.nativeElement.querySelector('.cf-datetime-field__date') as HTMLElement;
    if (!origin) {
      return;
    }
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cf-date-field-backdrop',
    });

    const portal = new ComponentPortal(CfDateCalendarPanelComponent);
    const ref = this.overlayRef.attach(portal);
    ref.instance.selectedIso = this.dateIso || null;
    ref.instance.min = this.minDate;
    ref.instance.max = null;
    ref.instance.dateSelect.subscribe((iso) => {
      this.dateIso = iso;
      this.dateDisplay = formatDateInput(iso);
      this.dateInputInvalid = false;
      this.syncConstraints();
      this.emitValue();
      this.onTouched();
      this.closeCalendar();
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
