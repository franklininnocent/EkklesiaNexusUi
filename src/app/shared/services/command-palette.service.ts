import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Opens the command palette. The palette component may mount lazily, so
 * {@link consumePendingOpen} replays a request issued before subscribe.
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private pendingOpen = false;
  private readonly openSubject = new Subject<void>();
  private readonly closeSubject = new Subject<void>();

  /** True after {@link open} until {@link close}. */
  isOpen = false;

  readonly open$ = this.openSubject.asObservable();
  readonly close$ = this.closeSubject.asObservable();

  open(): void {
    this.pendingOpen = true;
    this.isOpen = true;
    this.openSubject.next();
  }

  close(): void {
    this.pendingOpen = false;
    this.isOpen = false;
    this.closeSubject.next();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  consumePendingOpen(): boolean {
    const pending = this.pendingOpen;
    this.pendingOpen = false;
    return pending;
  }
}
