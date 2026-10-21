import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  cfEnglishMonthShort,
  cfEnglishWeekdayShort,
} from '@shared/utils/cf-intl.util';
import {
  isoDateFromParts,
  partsFromIsoDate,
  isIsoDateInRange,
} from '@shared/utils/cf-date-input.util';

@Component({
  selector: 'app-cf-date-calendar-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cf-date-calendar-panel.component.html',
  styleUrl: './cf-date-calendar-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfDateCalendarPanelComponent implements OnChanges {
  @Input() selectedIso: string | null = null;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Output() dateSelect = new EventEmitter<string>();

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth() + 1);

  readonly monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth() - 1, 1);
    return `${cfEnglishMonthShort(d)} ${this.viewYear()}`;
  });

  readonly weekdayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly weeks = computed(() => {
    const y = this.viewYear();
    const m = this.viewMonth();
    const first = new Date(y, m - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: { iso: string; day: number; outside: boolean; disabled: boolean; selected: boolean }[] = [];
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ iso: '', day: 0, outside: true, disabled: true, selected: false });
        continue;
      }
      const iso = isoDateFromParts(y, m, dayNum)!;
      const disabled = !isIsoDateInRange(iso, this.min, this.max);
      const selected = this.selectedIso === iso;
      cells.push({ iso, day: dayNum, outside: false, disabled, selected });
    }
    const rows: typeof cells[] = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(cells.slice(r, r + 7));
    }
    return rows;
  });

  ngOnChanges(_changes: SimpleChanges): void {
    this.syncViewToSelection();
  }

  private syncViewToSelection(): void {
    const parts = partsFromIsoDate(this.selectedIso);
    if (parts) {
      this.viewYear.set(parts.y);
      this.viewMonth.set(parts.m);
      return;
    }
    const now = new Date();
    this.viewYear.set(now.getFullYear());
    this.viewMonth.set(now.getMonth() + 1);
  }

  prevMonth(): void {
    let y = this.viewYear();
    let m = this.viewMonth() - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.viewYear.set(y);
    this.viewMonth.set(m);
  }

  nextMonth(): void {
    let y = this.viewYear();
    let m = this.viewMonth() + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.viewYear.set(y);
    this.viewMonth.set(m);
  }

  pick(iso: string): void {
    if (!iso || !isIsoDateInRange(iso, this.min, this.max)) {
      return;
    }
    this.dateSelect.emit(iso);
  }

  weekdayLabelForCell(iso: string, day: number): string {
    if (!iso) {
      return '';
    }
    const parts = partsFromIsoDate(iso);
    if (!parts) {
      return String(day);
    }
    const d = new Date(parts.y, parts.m - 1, parts.d);
    return `${cfEnglishWeekdayShort(d)} ${day}`;
  }
}
