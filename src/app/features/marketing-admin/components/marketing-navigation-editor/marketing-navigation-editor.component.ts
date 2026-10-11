import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { NavItemForm } from '../../models/marketing-structure.models';

@Component({
  selector: 'app-marketing-navigation-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketing-navigation-editor.component.html',
  styleUrl: './marketing-navigation-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingNavigationEditorComponent {
  @Input({ required: true }) items: NavItemForm[] = [];
  @Output() itemsChange = new EventEmitter<NavItemForm[]>();

  addRow(): void {
    this.itemsChange.emit([...this.items, { label: '', href: '#home' }]);
  }

  removeRow(index: number): void {
    const next = this.items.filter((_, i) => i !== index);
    this.itemsChange.emit(next);
  }

  updateRow(index: number, field: keyof NavItemForm, value: string): void {
    const next = this.items.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    );
    this.itemsChange.emit(next);
  }
}
