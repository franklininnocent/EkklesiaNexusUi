import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';
import { TabStripComponent, TabStripItem } from '@shared/components/tab-strip/tab-strip.component';
import { MINISTRIES_NAV_LINKS } from '../../config/ministries-nav.config';
import { ministriesBasePath } from '../../utils/ministries-links';

@Component({
  selector: 'app-ministries-sub-nav',
  standalone: true,
  imports: [TabStripComponent],
  templateUrl: './ministries-sub-nav.component.html',
  styleUrl: './ministries-sub-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinistriesSubNavComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly actions = inject(ActionAuthorizationService);

  private cachedBase = '';
  private cachedTabs: TabStripItem[] = [];
  private cachedCanViewAudit = false;
  private cachedCanConfigure = false;

  get tabs(): TabStripItem[] {
    const base = ministriesBasePath(this.router.url);
    const canViewAudit = this.auth.canViewTenantAuditLogs();
    const canConfigure = this.actions.allows('ministries.configure');
    if (
      base !== this.cachedBase ||
      this.cachedTabs.length === 0 ||
      canViewAudit !== this.cachedCanViewAudit ||
      canConfigure !== this.cachedCanConfigure
    ) {
      this.cachedBase = base;
      this.cachedCanViewAudit = canViewAudit;
      this.cachedCanConfigure = canConfigure;
      const links = MINISTRIES_NAV_LINKS.filter((link) => {
        if (link.id === 'audit' && !canViewAudit) {
          return false;
        }
        if (link.actionId && !this.actions.allows(link.actionId)) {
          return false;
        }
        return true;
      });
      this.cachedTabs = links.map((link) => {
        const suffix = link.path.replace('/ministries', '').replace(/^\//, '');
        const routerLink = suffix ? `${base}/${suffix}` : base;
        return {
          id: link.id,
          label: link.label,
          routerLink,
          exact: link.exact ?? false,
        };
      });
    }

    return this.cachedTabs;
  }
}
