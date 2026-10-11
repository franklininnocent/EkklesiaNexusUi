import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MARKETING_COPY_CONTRACT } from '../../constants/marketing-copy-contract';

export type MarketingHeroForm = {
  description: string;
  image: string;
  imageAlt: string;
};

@Component({
  selector: 'app-marketing-hero-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketing-hero-editor.component.html',
  styleUrl: './marketing-hero-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingHeroEditorComponent {
  readonly contract = MARKETING_COPY_CONTRACT;

  @Input() model: MarketingHeroForm = { description: '', image: '', imageAlt: '' };
  @Output() modelChange = new EventEmitter<MarketingHeroForm>();

  patch(field: keyof MarketingHeroForm, value: string): void {
    this.modelChange.emit({ ...this.model, [field]: value });
  }
}
