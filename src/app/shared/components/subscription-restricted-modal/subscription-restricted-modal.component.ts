import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SubscriptionAccessService } from '@core/services/subscription-access.service';
import { SubscriptionRestrictionService, SubscriptionRestrictionKind } from '@core/services/subscription-restriction.service';
import { CfDatePipe } from '@shared/pipes/cf-date.pipe';

@Component({
  selector: 'app-subscription-restricted-modal',
  standalone: true,
  imports: [CommonModule, ModalShellComponent, CfDatePipe],
  templateUrl: './subscription-restricted-modal.component.html',
  styleUrl: './subscription-restricted-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionRestrictedModalComponent {
  private readonly restriction = inject(SubscriptionRestrictionService);
  readonly access = inject(SubscriptionAccessService);

  get kind(): SubscriptionRestrictionKind | null {
    return this.restriction.modalKind();
  }

  get open(): boolean {
    return this.kind !== null;
  }

  title(kind: SubscriptionRestrictionKind | null): string {
    if (kind === 'locked') {
      return 'Account Access Restricted';
    }
    return 'Subscription Expired — View-Only Mode';
  }

  close(): void {
    this.restriction.closeModal();
  }

  renew(): void {
    this.restriction.navigateToRenew();
    this.close();
  }
}
