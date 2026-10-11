import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Mounts {@link GlobalFamilySearchComponent} on demand so DonationsService and
 * search UI are not in the authenticated shell bundle.
 */
@Injectable({ providedIn: 'root' })
export class GlobalFamilySearchService {
  private pendingMount = false;
  private pendingFocus = false;
  private readonly mountSubject = new Subject<void>();

  readonly mount$ = this.mountSubject.asObservable();

  requestMount(focus = false): void {
    this.pendingMount = true;
    if (focus) {
      this.pendingFocus = true;
    }
    this.mountSubject.next();
  }

  consumePendingMount(): boolean {
    const pending = this.pendingMount;
    this.pendingMount = false;
    return pending;
  }

  consumePendingFocus(): boolean {
    const pending = this.pendingFocus;
    this.pendingFocus = false;
    return pending;
  }
}
