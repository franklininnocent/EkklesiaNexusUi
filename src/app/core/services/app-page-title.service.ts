import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';

export const APP_BRAND_NAME = 'EkklesiaNexus';
export const APP_LOGIN_DOCUMENT_TITLE = `Sign in — ${APP_BRAND_NAME} Parish Application`;
const DEFAULT_AUTHENTICATED_TITLE = APP_BRAND_NAME;

/**
 * Keeps document.title in sync with route + auth context.
 * Static index.html must not imply the user is on the login screen after sign-in.
 */
@Injectable({ providedIn: 'root' })
export class AppPageTitleService {
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.applyForCurrentRoute());

    this.applyForCurrentRoute();
  }

  applyForCurrentRoute(): void {
    const url = this.router.url.split('?')[0] ?? '';
    if (this.isAuthUrl(url)) {
      this.title.setTitle(APP_LOGIN_DOCUMENT_TITLE);
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.title.setTitle(APP_LOGIN_DOCUMENT_TITLE);
      return;
    }

    const leaf = this.leafSnapshot(this.router.routerState.snapshot.root);
    const pageLabel = this.resolvePageLabel(leaf);
    this.title.setTitle(pageLabel ? `${pageLabel} — ${APP_BRAND_NAME}` : DEFAULT_AUTHENTICATED_TITLE);
  }

  private isAuthUrl(url: string): boolean {
    return url === '/auth' || url.startsWith('/auth/');
  }

  private leafSnapshot(route: ActivatedRoute['snapshot']): ActivatedRoute['snapshot'] {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  private resolvePageLabel(leaf: ActivatedRoute['snapshot']): string | null {
    const explicit = leaf.data['pageTitle'];
    if (typeof explicit === 'string' && explicit.trim()) {
      return explicit.trim();
    }

    const breadcrumb = leaf.data['breadcrumbLabel'];
    if (typeof breadcrumb === 'string' && breadcrumb.trim()) {
      return breadcrumb.trim();
    }

    const segments = leaf.url.map((s) => s.path).filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last || /^\d+$/.test(last)) {
      return null;
    }

    return this.humanizeSegment(last);
  }

  private humanizeSegment(segment: string): string {
    return segment
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
