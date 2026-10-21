import { Injectable, inject } from '@angular/core';
import { User } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { SupportSessionService } from '@features/support-center/services/support-session.service';
import { CatalogAction, catalogAction } from './action-catalog';

/**
 * Client mirror of the API gates used by permission-aware actions.
 * Display only. Missing user, missing permissions, and unknown actions are denied.
 */
@Injectable({ providedIn: 'root' })
export class ActionAuthorizationService {
  private readonly auth = inject(AuthService);
  private readonly supportSessions = inject(SupportSessionService);

  /** True once get-user has produced a permissions array. Empty is loaded. Undefined is not. */
  get ready(): boolean {
    const user = this.auth.currentUserValue;
    return !!user && Array.isArray(user.permissions);
  }

  allows(actionId: string): boolean {
    const action = catalogAction(actionId);
    const user = this.auth.currentUserValue;
    if (!action || !user || !Array.isArray(user.permissions)) {
      return false;
    }

    if (this.readonlySupportBlocks(user, action)) {
      return false;
    }

    switch (action.gate) {
      case 'tenant':
        return this.allowsTenant(user, action.slug);
      case 'user':
        return this.allowsUser(user, action.slug);
      case 'ecclesiastical':
        return this.auth.hasEcclesiasticalPermission(action.slug);
      default:
        return false;
    }
  }

  allowsAny(actionIds: readonly string[]): boolean {
    return actionIds.some((actionId) => this.allows(actionId));
  }

  allowsAll(actionIds: readonly string[]): boolean {
    return actionIds.length > 0 && actionIds.every((actionId) => this.allows(actionId));
  }

  /**
   * Live read-only (or unknown-mode) support sessions cannot perform mutations.
   * Standard and emergency sessions are not blocked here.
   */
  private readonlySupportBlocks(user: User, action: CatalogAction): boolean {
    if (!action.mutates || !this.auth.isPlatformActor(user) || !this.supportSessions.isSessionLive) {
      return false;
    }

    const mode = this.supportSessions.currentSession?.mode;
    return mode !== 'standard' && mode !== 'emergency';
  }

  /** Mirrors EnsureTenantPermission, including a live support session. */
  private allowsTenant(user: User, slug: string): boolean {
    if (this.auth.isPlatformActor(user) && this.supportSessions.isSessionLive) {
      return true;
    }

    if (this.auth.isSuperAdmin(user) || user.is_super_admin) {
      return true;
    }

    if (this.isPrimaryAdmin(user)) {
      return true;
    }

    if (user.tenant_id && this.auth.isTenantAdmin(user)) {
      return true;
    }

    return this.hasSlug(user, slug);
  }

  /** Mirrors UserController: slug, tenant admin, super admin, or Ekklesia admin. */
  private allowsUser(user: User, slug: string): boolean {
    if (this.auth.isSuperAdmin(user) || user.is_super_admin) {
      return true;
    }

    if (this.auth.isEkklesiaAdmin()) {
      return true;
    }

    if (user.tenant_id && this.auth.isTenantAdmin(user)) {
      return true;
    }

    return this.hasSlug(user, slug);
  }

  private hasSlug(user: User, slug: string): boolean {
    return !!user.permissions?.some((permission) => permission?.name === slug);
  }

  private isPrimaryAdmin(user: User): boolean {
    const raw = user.is_primary_admin as boolean | number | string | undefined;
    return raw === true || raw === 1 || raw === '1';
  }
}
