import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CfActionIconComponent } from '@shared/components/cf-action-icon/cf-action-icon.component';

@Component({
  selector: 'app-cf-select-create-footer',
  standalone: true,
  imports: [CfActionIconComponent],
  templateUrl: './cf-select-create-footer.component.html',
  styleUrl: './cf-select-create-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfSelectCreateFooterComponent {
  /** Visible command label (e.g. "Add new record"). */
  @Input() label = 'Add new record';

  /** Accessible name — must name the entity being created. */
  @Input({ required: true }) ariaLabel!: string;

  @Input() disabled = false;

  /** When true, parent handles pointer activation (e.g. ng-select footer host capture). */
  @Input() suppressPointerActivation = false;

  @Output() readonly activated = new EventEmitter<void>();

  /** Suppress duplicate click after pointer activation (ng-select tears down the panel before click). */
  private pointerActivated = false;

  /**
   * ng-select closes the overlay on document mousedown; the footer is destroyed before `click`.
   * Activate on mousedown (same pattern as leadership-role-combobox).
   */
  onMouseDown(event: MouseEvent): void {
    if (this.suppressPointerActivation || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    this.pointerActivated = true;
    this.activated.emit();
  }

  /** Keyboard and assistive tech still use click / Enter / Space. */
  onClick(event: Event): void {
    if (this.suppressPointerActivation) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (this.pointerActivated) {
      this.pointerActivated = false;
      return;
    }
    if (this.disabled) {
      return;
    }
    this.activated.emit();
  }
}
