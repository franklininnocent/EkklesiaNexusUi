import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { FooterForm, NavItemForm } from '../../models/marketing-structure.models';

@Component({
  selector: 'app-marketing-footer-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketing-footer-editor.component.html',
  styleUrl: './marketing-footer-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingFooterEditorComponent {
  @Input({ required: true }) model!: FooterForm;
  @Output() modelChange = new EventEmitter<FooterForm>();

  emit(): void {
    this.modelChange.emit(this.model);
  }

  updateStatement(value: string): void {
    this.model = { ...this.model, statement: value };
    this.emit();
  }

  updateLink(index: number, field: keyof NavItemForm, value: string): void {
    const links = this.model.links.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    );
    this.model = { ...this.model, links };
    this.emit();
  }

  addLink(): void {
    this.model = {
      ...this.model,
      links: [...this.model.links, { label: 'Privacy', href: '/privacy' }],
    };
    this.emit();
  }

  removeLink(index: number): void {
    this.model = {
      ...this.model,
      links: this.model.links.filter((_, i) => i !== index),
    };
    this.emit();
  }
}
