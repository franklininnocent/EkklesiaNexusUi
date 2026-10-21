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
  CF_MONTH_INPUT_PLACEHOLDER,
  formatMonthInput,
  parseMonthInputToIso,
} from '@shared/utils/cf-date-input.util';
import { CfMonthPickerPanelComponent } from '../cf-month-picker-panel/cf-month-picker-panel.component';

@Component({
  selector: 'app-cf-month-field',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './cf-month-field.component.html',
  styleUrl: './cf-month-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CfMonthFieldComponent),
      multi: true,
    },
  ],
})
export class CfMonthFieldComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly overlay = inject(Overlay);
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() inputId = '';
  @Input() ariaLabel = 'Month';
  @Input() invalid = false;
  @Input() disabled = false;
  @Input() placeholder = CF_MONTH_INPUT_PLACEHOLDER;

  @ViewChild('textInput') textInput?: ElementRef<HTMLInputElement>;

  displayText = '';
  inputInvalid = false;
  pickerOpen = false;

  private canonicalIso = '';
  private overlayRef: OverlayRef | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.canonicalIso = value && /^\d{4}-\d{2}$/.test(value.trim()) ? value.trim() : '';
    this.displayText = this.canonicalIso ? formatMonthInput(this.canonicalIso) : '';
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
      this.closePicker();
    }
    this.cdr.markForCheck();
  }

  onTextInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.displayText = target.value;
    if (this.displayText.trim() === '') {
      this.inputInvalid = false;
      this.commitIso('');
      return;
    }
    const iso = parseMonthInputToIso(this.displayText);
    if (iso) {
      this.inputInvalid = false;
      this.commitIso(iso);
      return;
    }
    if (this.displayText.length >= 7) {
      this.inputInvalid = true;
    }
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this.onTouched();
    const iso = parseMonthInputToIso(this.displayText);
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
    this.displayText = this.canonicalIso ? formatMonthInput(this.canonicalIso) : '';
    this.cdr.markForCheck();
  }

  togglePicker(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    if (this.pickerOpen) {
      this.closePicker();
      return;
    }
    this.openPicker();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pickerOpen) {
      this.closePicker();
    }
  }

  private commitIso(iso: string): void {
    this.canonicalIso = iso;
    if (iso) {
      this.displayText = formatMonthInput(iso);
    }
    this.onChange(iso);
    this.cdr.markForCheck();
  }

  private openPicker(): void {
    const origin = this.host.nativeElement.querySelector('.cf-month-field__input-wrap') as HTMLElement;
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

    const portal = new ComponentPortal(CfMonthPickerPanelComponent);
    const ref = this.overlayRef.attach(portal);
    ref.instance.selectedYm = this.canonicalIso || null;
    ref.instance.monthPick.subscribe((ym) => {
      this.inputInvalid = false;
      this.commitIso(ym);
      this.onTouched();
      this.closePicker();
      this.textInput?.nativeElement.focus();
    });

    this.overlayRef.backdropClick().subscribe(() => this.closePicker());
    this.pickerOpen = true;
    this.cdr.markForCheck();
  }

  private closePicker(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.pickerOpen = false;
    this.cdr.markForCheck();
  }
}
