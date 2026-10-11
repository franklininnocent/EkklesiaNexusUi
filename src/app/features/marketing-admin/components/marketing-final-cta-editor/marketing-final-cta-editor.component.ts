import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { FinalCtaForm } from '../../models/marketing-structure.models';

@Component({
  selector: 'app-marketing-final-cta-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketing-final-cta-editor.component.html',
  styleUrl: './marketing-final-cta-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingFinalCtaEditorComponent {
  @Input({ required: true }) model!: FinalCtaForm;
  @Output() modelChange = new EventEmitter<FinalCtaForm>();

  emit(): void {
    this.modelChange.emit(this.model);
  }
}
