import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';
import { SupportSessionService } from '@features/support-center/services/support-session.service';

/**
 * Renders content only when the signed-in user may perform the catalog action.
 * The element stays out of the DOM until the check passes.
 *
 *   <button *appCan="'families.create'">Add Family</button>
 */
@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class CanActionDirective {
  private readonly authz = inject(ActionAuthorizationService);
  private readonly auth = inject(AuthService);
  private readonly supportSessions = inject(SupportSessionService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);

  readonly appCan = input.required<string>();

  private readonly user = toSignal(this.auth.currentUser$, { initialValue: this.auth.currentUserValue });
  private readonly session = toSignal(this.supportSessions.session$, {
    initialValue: this.supportSessions.currentSession,
  });

  private shown = false;

  constructor() {
    effect(() => {
      this.user();
      this.session();
      const allowed = this.authz.allows(this.appCan());
      if (allowed === this.shown) {
        return;
      }
      this.container.clear();
      if (allowed) {
        this.container.createEmbeddedView(this.template);
      }
      this.shown = allowed;
    });
  }
}
