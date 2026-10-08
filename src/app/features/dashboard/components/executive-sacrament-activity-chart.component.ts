import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { Chart } from '@shared/charts/ekklesia-chart';
import { ExecutiveSacramentActivitySlice } from '../models/executive-dashboard.model';

const TYPE_COLORS: Record<string, string> = {
  BAPTISM: '#3b6ebf',
  CONFIRMATION: '#7c6bc4',
  EUCHARIST: '#0d9488',
  MATRIMONY: '#c45c8a',
  HOLY_ORDERS: '#d97706',
};

const FALLBACK_COLORS = ['#2563eb', '#14b8a6', '#84cc16', '#64748b'];

@Component({
  selector: 'app-executive-sacrament-activity-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="exec-sacrament-chart" aria-label="This year's sacramental celebrations">
      <p class="exec-sacrament-chart__sr-only" *ngIf="hasData">{{ dataSummary }}</p>
      <div class="exec-sacrament-chart__layout" *ngIf="hasData; else empty">
        <div class="exec-sacrament-chart__canvas-wrap">
          <canvas
            #chartCanvas
            role="img"
            [attr.aria-label]="dataSummary"
            (click)="onCanvasClick($event)"
          ></canvas>
        </div>
        <ul class="exec-sacrament-chart__legend">
          <li *ngFor="let slice of populatedSlices">
            <button
              type="button"
              class="exec-sacrament-chart__legend-btn"
              (click)="drillToSlice(slice)"
              [attr.aria-label]="'View ' + slice.label + ' records this year'"
            >
              <i [style.background]="colorFor(slice.code)"></i>
              <span class="exec-sacrament-chart__legend-label">{{ slice.label }}</span>
              <span class="exec-sacrament-chart__legend-value">
                <strong>{{ slice.count }}</strong>
                <span class="cf-meta">({{ formatPercent(slice.percent) }})</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
      <ng-template #empty>
        <p class="cf-chart-panel__empty">{{ emptyMessage }}</p>
      </ng-template>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        position: relative;
        z-index: 1;
      }
      .exec-sacrament-chart__layout {
        display: grid;
        grid-template-columns: minmax(6rem, auto) minmax(0, 1fr);
        gap: 0.65rem;
        align-items: center;
        pointer-events: auto;
      }
      .exec-sacrament-chart__canvas-wrap {
        position: relative;
        height: 9.5rem;
        width: 100%;
        max-width: 9.5rem;
        margin: 0 auto;
        pointer-events: auto;
      }
      .exec-sacrament-chart__canvas-wrap canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
        cursor: pointer;
        pointer-events: auto;
      }
      .exec-sacrament-chart__legend {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.35rem;
        font-size: 0.75rem;
        pointer-events: auto;
      }
      .exec-sacrament-chart__legend-btn {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.45rem;
        align-items: baseline;
        width: 100%;
        margin: 0;
        padding: 0.15rem 0.2rem;
        border: 0;
        border-radius: var(--cf-radius-sm, 4px);
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
        pointer-events: auto;
      }
      .exec-sacrament-chart__legend-btn:hover,
      .exec-sacrament-chart__legend-btn:focus-visible {
        background: var(--cf-surface-muted, #f8fafc);
      }
      .exec-sacrament-chart__legend i {
        width: 0.65rem;
        height: 0.65rem;
        border-radius: 999px;
        margin-top: 0.2rem;
        pointer-events: none;
      }
      .exec-sacrament-chart__legend-value {
        text-align: right;
        white-space: nowrap;
      }
      .exec-sacrament-chart__sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      @media (max-width: 640px) {
        .exec-sacrament-chart__layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ExecutiveSacramentActivityChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  @Input() slices: ExecutiveSacramentActivitySlice[] = [];
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() emptyReason: string = 'none';

  @ViewChild('chartCanvas') private canvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;
  private lastRenderKey = '';
  private renderCoalescePending = false;
  private canvasWaitAttempts = 0;
  private static readonly MAX_CANVAS_WAIT_ATTEMPTS = 24;

  get populatedSlices(): ExecutiveSacramentActivitySlice[] {
    return this.slices.filter((slice) => Number(slice.count) > 0);
  }

  get hasData(): boolean {
    return this.populatedSlices.length > 0;
  }

  get dataSummary(): string {
    if (!this.hasData) {
      return this.emptyMessage;
    }

    return this.populatedSlices
      .map((slice) => `${slice.label}: ${slice.count} (${this.formatPercent(slice.percent)})`)
      .join(', ');
  }

  get emptyMessage(): string {
    if (this.emptyReason === 'only_excluded_types') {
      return 'This year’s register activity is Reconciliation or Anointing of the Sick only — those types are omitted here so they do not dominate the mix.';
    }

    return 'No Baptism, Confirmation, First Communion, Marriage, or Holy Orders recorded this year.';
  }

  colorFor(code: string): string {
    const key = (code || '').toUpperCase();
    if (TYPE_COLORS[key]) {
      return TYPE_COLORS[key];
    }
    const index = Math.abs(this.hashCode(key)) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[index];
  }

  formatPercent(value: number): string {
    return `${Math.round(value * 10) / 10}%`;
  }

  drillToSlice(slice: ExecutiveSacramentActivitySlice): void {
    const query: Record<string, string> = {
      sacrament_type_id: String(slice.sacrament_type_id),
    };
    if (this.dateFrom) {
      query['date_from'] = this.dateFrom;
    }
    if (this.dateTo) {
      query['date_to'] = this.dateTo;
    }
    void this.router.navigate(['/sacraments/register'], { queryParams: query });
  }

  onCanvasClick(event: MouseEvent): void {
    const chart = this.chart;
    if (!chart) {
      return;
    }

    const hits = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
    const index = hits[0]?.index;
    if (index === undefined) {
      return;
    }

    const slice = this.populatedSlices[index];
    if (slice) {
      this.drillToSlice(slice);
    }
  }

  ngAfterViewInit(): void {
    this.scheduleRender();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slices'] || changes['dateFrom'] || changes['dateTo']) {
      this.scheduleRender();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private hashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private scheduleRender(): void {
    if (this.renderCoalescePending) {
      return;
    }
    this.renderCoalescePending = true;
    queueMicrotask(() => {
      this.renderCoalescePending = false;
      this.canvasWaitAttempts = 0;
      this.renderChart();
    });
  }

  private renderChart(): void {
    if (!this.hasData) {
      this.chart?.destroy();
      this.chart = undefined;
      this.lastRenderKey = '';
      return;
    }

    const canvas = this.canvas?.nativeElement;
    if (!canvas) {
      if (this.canvasWaitAttempts < ExecutiveSacramentActivityChartComponent.MAX_CANVAS_WAIT_ATTEMPTS) {
        this.canvasWaitAttempts += 1;
        queueMicrotask(() => this.renderChart());
      }
      return;
    }

    if (typeof canvas.getContext !== 'function' || !canvas.getContext('2d')) {
      return;
    }

    const renderKey = this.populatedSlices.map((row) => `${row.code}:${row.count}`).join('|');
    if (renderKey === this.lastRenderKey && this.chart) {
      return;
    }
    this.lastRenderKey = renderKey;

    const rows = this.populatedSlices;
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          {
            data: rows.map((row) => row.count),
            backgroundColor: rows.map((row) => this.colorFor(row.code)),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: '58%',
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        onHover: (_event, elements) => {
          canvas.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const slice = rows[ctx.dataIndex];
                if (!slice) {
                  return '';
                }
                return ` ${slice.label}: ${slice.count} (${this.formatPercent(slice.percent)})`;
              },
            },
          },
        },
      },
    });

    this.cdr.markForCheck();
  }
}
