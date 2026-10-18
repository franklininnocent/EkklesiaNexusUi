import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CfCurrencyPipe } from '@shared/pipes/cf-currency.pipe';
import { cfFormatDate } from '@shared/utils/cf-intl.util';
import {
  FamilyCollectDuesBulkSelect,
  FamilyCollectDuesInstallmentRow,
  FamilyCollectDuesPayload,
  FamilyCollectDuesProject,
} from '../../models/donation.model';

export interface InstallmentSelectionLine {
  id: string;
  project_id: string;
  label: string;
  remaining: number;
  collectAmount: number;
}

@Component({
  selector: 'app-quick-collect-dues-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CfCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="qc-dues" *ngIf="collectDues">
      <div class="qc-dues__summary">
        <div class="qc-dues__metric">
          <span>Collectible due</span>
          <strong>{{ collectDues.summary.collectible_due | cfCurrency : null : 0 }}</strong>
        </div>
        <div class="qc-dues__metric">
          <span>Overdue</span>
          <strong>{{ collectDues.summary.overdue_amount | cfCurrency : null : 0 }}</strong>
        </div>
        <div class="qc-dues__metric">
          <span>Total paid</span>
          <strong>{{ collectDues.summary.total_paid | cfCurrency : null : 0 }}</strong>
        </div>
        <div class="qc-dues__metric qc-dues__metric--accent">
          <span>Selected</span>
          <strong>{{ selectionCount }} · {{ selectionTotal | cfCurrency : null : 0 }}</strong>
        </div>
      </div>

      <p class="qc-dues__hint">Overdue is past-due collectible balance, not the full commitment target.</p>

      <div class="qc-dues__projects">
        <article class="qc-project" *ngFor="let project of collectDues.projects">
          <header class="qc-project__head">
            <button type="button" class="qc-project__toggle" (click)="toggleProject(project.project_id)">
              <span class="qc-project__chevron">{{ expandedProjectId === project.project_id ? '▾' : '▸' }}</span>
              <span class="qc-project__title">{{ project.project_name }}</span>
            </button>
            <div class="qc-project__stats">
              <span>Installment balance {{ project.installment_outstanding | cfCurrency : null : 0 }}</span>
              <span class="qc-project__meta" *ngIf="project.installment_status">
                Overdue inst. {{ project.installment_status.overdue }}
              </span>
            </div>
          </header>

          <div class="qc-project__commitment" *ngIf="expandedProjectId === project.project_id">
            <span>Commitment {{ project.target_amount | cfCurrency : null : 0 }}</span>
            <span>Credited {{ project.amount_collected | cfCurrency : null : 0 }}</span>
            <span>Target gap {{ project.target_gap | cfCurrency : null : 0 }}</span>
          </div>

          <div class="qc-project__body" *ngIf="expandedProjectId === project.project_id">
            <div class="qc-project__actions">
              <button type="button" class="cf-btn cf-btn-sm" (click)="requestBulkSelect.emit({ projectId: project.project_id, scope: 'overdue' })">
                Select all overdue
              </button>
              <button type="button" class="cf-btn cf-btn-sm" (click)="requestBulkSelect.emit({ projectId: project.project_id, scope: 'outstanding' })">
                Select all outstanding
              </button>
              <label class="qc-filter">
                <span class="sr-only">Filter installments</span>
                <select [ngModel]="installmentScope" (ngModelChange)="scopeChange.emit($event)">
                  <option value="outstanding">All outstanding</option>
                  <option value="overdue">Overdue only</option>
                </select>
              </label>
            </div>

            <p class="qc-dues__loading" *ngIf="loadingInstallments">Loading installments…</p>

            <table class="qc-inst-table" *ngIf="!loadingInstallments && installmentRows.length">
              <thead>
                <tr>
                  <th scope="col"><span class="sr-only">Select</span></th>
                  <th scope="col">Installment</th>
                  <th scope="col">Due</th>
                  <th scope="col" class="num">Original</th>
                  <th scope="col" class="num">Credited</th>
                  <th scope="col" class="num">Remaining</th>
                  <th scope="col" class="num">Collect</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of installmentRows" [class.is-selected]="isSelected(row.id)">
                  <td>
                    <input
                      type="checkbox"
                      [checked]="isSelected(row.id)"
                      (change)="toggleRow(row)"
                      [attr.aria-label]="'Select ' + row.installment_label"
                    />
                  </td>
                  <td>{{ row.installment_label }}</td>
                  <td>{{ formatDueDate(row.due_date) }}</td>
                  <td class="num">{{ row.amount_due | cfCurrency : null : 0 }}</td>
                  <td class="num">{{ row.amount_paid | cfCurrency : null : 0 }}</td>
                  <td class="num">{{ row.remaining | cfCurrency : null : 0 }}</td>
                  <td class="num">
                    <input
                      type="number"
                      class="qc-collect-input"
                      min="0.01"
                      [max]="row.remaining"
                      step="0.01"
                      [disabled]="!isSelected(row.id)"
                      [ngModel]="collectAmountFor(row.id, row.remaining)"
                      (ngModelChange)="onCollectAmountChange(row, $event)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <p class="qc-dues__empty" *ngIf="!loadingInstallments && !installmentRows.length">No eligible installments in this view.</p>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .qc-dues { display: grid; gap: 0.75rem; }
    .qc-dues__summary {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem;
    }
    @media (min-width: 640px) {
      .qc-dues__summary { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    .qc-dues__metric {
      display: grid; gap: 0.15rem; padding: 0.5rem 0.6rem;
      border: 1px solid var(--cf-panel-border); border-radius: var(--cf-radius-sm);
      background: var(--cf-slate-50); font-size: 0.78rem;
    }
    .qc-dues__metric span { color: var(--cf-muted); }
    .qc-dues__metric strong { font-size: 0.95rem; color: var(--cf-slate-900); }
    .qc-dues__metric--accent { border-color: var(--cf-primary); background: var(--cf-indigo-soft); }
    .qc-dues__hint { margin: 0; font-size: 0.75rem; color: var(--cf-muted); }
    .qc-project {
      border: 1px solid var(--cf-panel-border); border-radius: var(--cf-radius);
      overflow: hidden;
    }
    .qc-project__head {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem;
      padding: 0.65rem 0.75rem; background: #fff;
    }
    .qc-project__toggle {
      display: inline-flex; align-items: center; gap: 0.35rem;
      border: 0; background: transparent; cursor: pointer; font-weight: 600;
      color: var(--cf-slate-900); text-align: left;
    }
    .qc-project__stats { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.78rem; color: var(--cf-slate-700); }
    .qc-project__meta { color: var(--cf-critical); }
    .qc-project__commitment {
      display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0 0.75rem 0.5rem;
      font-size: 0.72rem; color: var(--cf-muted);
    }
    .qc-project__body { padding: 0 0.75rem 0.75rem; display: grid; gap: 0.5rem; }
    .qc-project__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .qc-filter select {
      border: 1px solid var(--cf-panel-border); border-radius: var(--cf-radius-sm);
      padding: 0.35rem 0.5rem; font-size: 0.78rem;
    }
    .qc-inst-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    .qc-inst-table th, .qc-inst-table td { padding: 0.35rem 0.25rem; border-bottom: 1px solid var(--cf-slate-100); }
    .qc-inst-table th { text-align: left; color: var(--cf-muted); font-weight: 600; }
    .qc-inst-table td.num, .qc-inst-table th.num { text-align: right; }
    .qc-inst-table tr.is-selected { background: var(--cf-indigo-soft); }
    .qc-collect-input {
      width: 5.5rem; text-align: right; border: 1px solid var(--cf-panel-border);
      border-radius: var(--cf-radius-sm); padding: 0.2rem 0.35rem;
    }
    .qc-dues__loading, .qc-dues__empty { margin: 0; font-size: 0.8rem; color: var(--cf-muted); }
  `]
})
export class QuickCollectDuesPanelComponent {
  @Input() collectDues: FamilyCollectDuesPayload | null = null;
  @Input() expandedProjectId: string | null = null;
  @Input() installmentRows: FamilyCollectDuesInstallmentRow[] = [];
  @Input() loadingInstallments = false;
  @Input() installmentScope: 'outstanding' | 'overdue' = 'outstanding';
  @Input() selection: InstallmentSelectionLine[] = [];
  @Input() activeProjectId: string | null = null;

  @Output() toggleProjectId = new EventEmitter<string>();
  @Output() requestBulkSelect = new EventEmitter<{ projectId: string; scope: 'overdue' | 'outstanding' }>();
  @Output() scopeChange = new EventEmitter<'outstanding' | 'overdue'>();
  @Output() selectionChange = new EventEmitter<InstallmentSelectionLine[]>();

  get selectionCount(): number {
    return this.selection.length;
  }

  get selectionTotal(): number {
    return this.selection.reduce((sum, line) => sum + line.collectAmount, 0);
  }

  formatDueDate(value: string | null | undefined): string {
    return value ? cfFormatDate(value) : '—';
  }

  toggleProject(projectId: string): void {
    this.toggleProjectId.emit(projectId);
  }

  isSelected(id: string): boolean {
    return this.selection.some((line) => line.id === id);
  }

  collectAmountFor(id: string, remaining: number): number {
    const line = this.selection.find((item) => item.id === id);
    return line?.collectAmount ?? remaining;
  }

  toggleRow(row: FamilyCollectDuesInstallmentRow): void {
    const next = [...this.selection];
    const index = next.findIndex((line) => line.id === row.id);
    if (index >= 0) {
      next.splice(index, 1);
    } else if (this.activeProjectId && this.activeProjectId !== row.project_id) {
      next.length = 0;
      next.push(this.toSelectionLine(row));
    } else {
      next.push(this.toSelectionLine(row));
    }
    this.selectionChange.emit(next);
  }

  onCollectAmountChange(row: FamilyCollectDuesInstallmentRow, value: number | null): void {
    if (!this.isSelected(row.id)) {
      return;
    }
    const amount = Math.min(row.remaining, Math.max(0, Number(value) || 0));
    const next = this.selection.map((line) =>
      line.id === row.id ? { ...line, collectAmount: amount } : line
    );
    this.selectionChange.emit(next);
  }

  applyBulkSelect(bulk: FamilyCollectDuesBulkSelect, rows: FamilyCollectDuesInstallmentRow[]): void {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const next: InstallmentSelectionLine[] = [];
    for (const id of bulk.installment_ids) {
      const row = byId.get(id);
      if (row) {
        next.push(this.toSelectionLine(row));
      }
    }
    this.selectionChange.emit(next);
  }

  private toSelectionLine(row: FamilyCollectDuesInstallmentRow): InstallmentSelectionLine {
    return {
      id: row.id,
      project_id: row.project_id,
      label: row.installment_label,
      remaining: row.remaining,
      collectAmount: row.remaining,
    };
  }
}
