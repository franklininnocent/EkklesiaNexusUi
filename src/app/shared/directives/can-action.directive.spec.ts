import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { User } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { SupportSession } from '@features/support-center/models/support-access.model';
import { SupportSessionService } from '@features/support-center/services/support-session.service';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { CanActionDirective } from './can-action.directive';

@Component({
  standalone: true,
  imports: [CanActionDirective],
  template: `<button id="add" *appCan="'families.create'">Add Family</button>`,
})
class HostComponent {}

describe('CanActionDirective', () => {
  const user$ = new BehaviorSubject<User | null>(null);
  const session$ = new BehaviorSubject<SupportSession | null>(null);
  let allows: jest.Mock;

  beforeEach(() => {
    user$.next(null);
    session$.next(null);
    allows = jest.fn(() => false);

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser$: user$,
            get currentUserValue() {
              return user$.value;
            },
          },
        },
        {
          provide: SupportSessionService,
          useValue: {
            session$,
            get currentSession() {
              return session$.value;
            },
          },
        },
        { provide: ActionAuthorizationService, useValue: { allows } },
      ],
    });
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('keeps the action out of the DOM until the check passes', () => {
    const element = render();
    expect(element.querySelector('#add')).toBeNull();

    allows.mockReturnValue(true);
    user$.next({ id: 1, permissions: [{ name: 'families.create' }] } as User);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#add')).not.toBeNull();
  });

  it('removes the action when the signed-in user changes', () => {
    allows.mockReturnValue(true);
    user$.next({ id: 1, permissions: [] } as unknown as User);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#add')).not.toBeNull();

    allows.mockReturnValue(false);
    user$.next({ id: 2, permissions: [] } as unknown as User);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#add')).toBeNull();
  });
});
