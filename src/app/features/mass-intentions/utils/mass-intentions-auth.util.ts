import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';

/** Mirrors API `EnsureTenantPermission` / `AuthorizesTenantPermission` for Mass Intentions actions. */
export function canCreateMassIntention(actions: ActionAuthorizationService): boolean {
  return actions.allows('mass.intentions.create');
}

export function canCloseMassIntention(auth: AuthService): boolean {
  return auth.hasTenantPermission('mass.intentions.review');
}

export function canConfigureMassIntentions(actions: ActionAuthorizationService): boolean {
  return actions.allows('mass.intentions.configure');
}

export function canExportMassRegister(auth: AuthService): boolean {
  return auth.hasTenantPermission('mass.intentions.register.export');
}

export function canScheduleMasses(actions: ActionAuthorizationService): boolean {
  return actions.allows('mass.intentions.schedule');
}

export function canFulfilMasses(actions: ActionAuthorizationService): boolean {
  return actions.allows('mass.intentions.fulfil');
}

export function canViewMassOfferings(auth: AuthService): boolean {
  return auth.hasTenantPermission('mass.intentions.offerings.view');
}
