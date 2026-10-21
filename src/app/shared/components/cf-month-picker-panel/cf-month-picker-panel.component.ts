import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cfEnglishMonthShort } from '@shared/utils/cf-intl.util';

@Component({
  selector: 'app-cf-month-picker-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cf-month-picker-panel.component.html',
  styleUrl: './cf-month-picker-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfMonthPickerPanelComponent implements OnChanges {
  @Input() selectedYm: string | null = null;
  @Output() monthPick = new EventEmitter<string>();

  readonly viewYear = signal(new Date().getFullYear());

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.selectedYm && /^\d{4}-\d{2}$/.test(this.selectedYm)) {
      this.viewYear.set(Number(this.selectedYm.split('-')[0]));
    }
  }

  prevYear(): void {
    this.viewYear.update((y) => y - 1);
  }

  nextYear(): void {
    this.viewYear.update((y) => y + 1);
  }

  pick(month: number): void {
    const ym = `${this.viewYear()}-${String(month).padStart(2, '0')}`;
    this.monthPick.emit(ym);
  }

  monthLabel(month: number): string {
    const d = new Date(this.viewYear(), month - 1, 1);
    return cfEnglishMonthShort(d);
  }

  isSelected(month: number): boolean {
    if (!this.selectedYm) {
      return false;
    }
    const [y, m] = this.selectedYm.split('-').map(Number);
    return y === this.viewYear() && m === month;
  }
}
