import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SubscriptionAccessService } from './subscription-access.service';

export type SubscriptionRestrictionKind = 'view_only' | 'locked' | 'read_only';

@Injectable({ providedIn: 'root' })
export class SubscriptionRestrictionService {
  private readonly access = inject(SubscriptionAccessService);
  private readonly router = inject(Router);

  readonly modalKind = signal<SubscriptionRestrictionKind | null>(null);

  constructor() {
    effect(() => {
      const open = this.modalKind();
      const snap = this.access.snapshotSignal();
      if (open === null || snap == null) {
        return;
      }
      if (this.currentKind() === null) {
        this.modalKind.set(null);
      }
    });
  }

  /** Opens the restriction modal once; returns false if the action should be blocked. */
  handleRestrictedAction(kind?: SubscriptionRestrictionKind): boolean {
    const resolved = kind ?? this.currentKind();
    if (resolved === null) {
      return true;
    }
    if (this.modalKind() === null) {
      this.modalKind.set(resolved);
    }
    return false;
  }

  currentKind(): SubscriptionRestrictionKind | null {
    const snap = this.access.snapshotSignal();
    if (!snap) {
      return null;
    }
    if (snap.is_locked || snap.access_mode === 'locked') {
      return 'locked';
    }
    if (snap.is_view_only || snap.access_mode === 'view_only') {
      return 'view_only';
    }
    if (snap.is_read_only || snap.access_mode === 'read_only') {
      return 'read_only';
    }
    return null;
  }

  shouldBlockMutation(): boolean {
    return this.currentKind() !== null;
  }

  closeModal(): void {
    this.modalKind.set(null);
  }

  navigateToRenew(): void {
    void this.router.navigate(['/settings/my-subscription']);
  }
}
