import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CfDateTimeFieldComponent } from '@shared/components/cf-datetime-field/cf-datetime-field.component';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BillingAdminNavComponent } from '../../components/billing-admin-nav/billing-admin-nav.component';
import { BillingAdminService } from '../../services/billing-admin.service';

interface GatewayRow {
  environment: string;
  enabled: boolean;
  live_checkout_enabled?: boolean;
  public_key_id?: string;
}

interface OfflineMethodRow {
  id: number;
  code: string;
  label: string;
  enabled: boolean;
  instructions?: unknown;
}

@Component({
  selector: 'app-billing-controls-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CfDateTimeFieldComponent, BillingAdminNavComponent, PageHeaderComponent, ModalShellComponent],
  templateUrl: './billing-controls.page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../styles/billing-workspace.scss', './billing-controls.page.scss'],
})
export class BillingControlsPage implements OnInit {
  private readonly billing = inject(BillingAdminService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  customerPaymentActions = 'disabled';
  onlineCheckout = 'disabled';
  offlineClaims = 'disabled';
  maintenanceMessage = '';
  maintenanceUntil = '';
  maintenanceRevertTo: 'enabled' | 'disabled' = 'enabled';
  reason = '';

  operationsPendingClaims = 0;
  operationsAwaitingOrders = 0;

  gateways: GatewayRow[] = [];
  webhookPending = 0;
  webhookFailed = 0;

  testPublicKeyId = '';
  testApiSecret = '';
  testWebhookSecret = '';
  livePublicKeyId = '';
  liveApiSecret = '';
  liveWebhookSecret = '';
  liveCheckoutEnabled = false;
  gatewayReason = '';

  offlineMethods: OfflineMethodRow[] = [];
  offlineMethodReason = '';

  availabilityOpen = false;
  gatewayTestOpen = false;
  gatewayLiveOpen = false;
  offlineMethodEdit: OfflineMethodRow | null = null;
  offlineMethodEnabled = false;
  offlineMethodInstructions = '';

  ngOnInit(): void {
    forkJoin({
      controls: this.billing.getControls(),
      methods: this.billing.listOfflineMethods(),
      webhooks: this.billing.webhookHealth(),
      summary: this.billing.operationsSummary(),
    }).subscribe({
      next: ({ controls, methods, webhooks, summary }) => {
        const data = controls.data as { billing?: Record<string, string>; gateways?: GatewayRow[] };
        const billing = data?.billing ?? {};
        this.customerPaymentActions = billing['customer_payment_actions'] ?? 'disabled';
        this.onlineCheckout = billing['online_checkout'] ?? 'disabled';
        this.offlineClaims = billing['offline_claims'] ?? 'disabled';
        this.maintenanceMessage = billing['maintenance_message'] ?? '';
        this.maintenanceUntil = billing['maintenance_until'] ?? '';
        this.maintenanceRevertTo = (billing['maintenance_revert_to'] as 'enabled' | 'disabled') ?? 'enabled';
        this.gateways = data?.gateways ?? [];
        const test = this.gateways.find((g) => g.environment === 'test');
        const live = this.gateways.find((g) => g.environment === 'live');
        this.testPublicKeyId = test?.public_key_id ?? '';
        this.livePublicKeyId = live?.public_key_id ?? '';
        this.liveCheckoutEnabled = !!live?.live_checkout_enabled;
        this.offlineMethods = (methods.data as OfflineMethodRow[]) ?? [];
        const wh = webhooks.data as { pending?: number; failed?: number };
        this.webhookPending = wh?.pending ?? 0;
        this.webhookFailed = wh?.failed ?? 0;
        const ops = summary.data as { pending_offline_claims?: number; orders_awaiting_payment?: number };
        this.operationsPendingClaims = ops?.pending_offline_claims ?? 0;
        this.operationsAwaitingOrders = ops?.orders_awaiting_payment ?? 0;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load billing controls.');
        this.loading.set(false);
      },
    });
  }

  openAvailability(): void {
    this.availabilityOpen = true;
    this.reason = '';
  }

  closeAvailability(): void {
    if (!this.saving()) {
      this.availabilityOpen = false;
    }
  }

  openGatewayTest(): void {
    this.gatewayTestOpen = true;
    this.gatewayReason = '';
  }

  closeGatewayTest(): void {
    if (!this.saving()) {
      this.gatewayTestOpen = false;
    }
  }

  openGatewayLive(): void {
    this.gatewayLiveOpen = true;
    this.gatewayReason = '';
  }

  closeGatewayLive(): void {
    if (!this.saving()) {
      this.gatewayLiveOpen = false;
    }
  }

  openOfflineMethod(method: OfflineMethodRow): void {
    this.offlineMethodEdit = method;
    this.offlineMethodEnabled = method.enabled;
    this.offlineMethodInstructions = this.instructionBody(method);
    this.offlineMethodReason = '';
  }

  closeOfflineMethod(): void {
    if (!this.saving()) {
      this.offlineMethodEdit = null;
    }
  }

  saveOfflineMethod(): void {
    if (!this.offlineMethodEdit || !this.offlineMethodReason.trim()) {
      return;
    }
    this.saving.set(true);
    this.billing
      .updateOfflineMethod(this.offlineMethodEdit.id, {
        enabled: this.offlineMethodEnabled,
        instructions: { body: this.offlineMethodInstructions },
        reason: this.offlineMethodReason.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.offlineMethodEdit = null;
          this.ngOnInit();
        },
        error: () => this.saving.set(false),
      });
  }

  saveControls(): void {
    if (!this.reason.trim()) {
      this.error.set('A reason is required for billing control changes.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.billing
      .updateControls({
        customer_payment_actions: this.customerPaymentActions as 'enabled' | 'disabled',
        online_checkout: this.onlineCheckout as 'enabled' | 'disabled' | 'maintenance',
        offline_claims: this.offlineClaims as 'enabled' | 'disabled',
        maintenance_message: this.maintenanceMessage || null,
        maintenance_until: this.maintenanceUntil || null,
        maintenance_revert_to: this.maintenanceRevertTo,
        reason: this.reason.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reason = '';
          this.availabilityOpen = false;
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Save failed.');
        },
      });
  }

  saveGateway(environment: 'test' | 'live'): void {
    if (!this.gatewayReason.trim()) {
      this.error.set('A reason is required for gateway changes.');
      return;
    }
    this.saving.set(true);
    const payload: Record<string, unknown> = {
      reason: this.gatewayReason.trim(),
      enabled: true,
    };
    if (environment === 'test') {
      payload['public_key_id'] = this.testPublicKeyId || null;
      if (this.testApiSecret) {
        payload['api_secret'] = this.testApiSecret;
      }
      if (this.testWebhookSecret) {
        payload['webhook_secret'] = this.testWebhookSecret;
      }
    } else {
      payload['public_key_id'] = this.livePublicKeyId || null;
      payload['live_checkout_enabled'] = this.liveCheckoutEnabled;
      if (this.liveApiSecret) {
        payload['api_secret'] = this.liveApiSecret;
      }
      if (this.liveWebhookSecret) {
        payload['webhook_secret'] = this.liveWebhookSecret;
      }
    }
    this.billing.updateGateway(environment, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.testApiSecret = '';
        this.testWebhookSecret = '';
        this.liveApiSecret = '';
        this.liveWebhookSecret = '';
        this.gatewayReason = '';
        this.gatewayTestOpen = false;
        this.gatewayLiveOpen = false;
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Gateway save failed.');
      },
    });
  }

  instructionBody(method: OfflineMethodRow): string {
    const instr = method.instructions as { body?: string } | null;
    return instr?.body ?? '';
  }

}
