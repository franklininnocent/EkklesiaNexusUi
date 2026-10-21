import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { isObservable, Observable, of, firstValueFrom } from 'rxjs';
import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { AuthService } from '@core/services/auth.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  let navigate: jest.Mock;
  let allows: jest.Mock;
  let isAuthenticated: jest.Mock;
  const user = { id: 7, permissions: [] };

  beforeEach(() => {
    navigate = jest.fn();
    allows = jest.fn(() => false);
    isAuthenticated = jest.fn(() => true);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated,
            currentUserValue: user,
          },
        },
        { provide: ActionAuthorizationService, useValue: { allows } },
        {
          provide: Store,
          useValue: {
            select: () => of(user),
            dispatch: jest.fn(),
          },
        },
      ],
    });
  });

  async function run(action: string | undefined): Promise<boolean> {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(
        { data: action ? { permissionAction: action } : {} } as never,
        { url: '/users' } as never
      )
    ) as boolean | Observable<boolean>;
    if (!isObservable(result)) {
      return result;
    }
    return firstValueFrom(result);
  }

  it('redirects to login when the session is missing', async () => {
    isAuthenticated.mockReturnValue(false);
    await expect(run('users.view')).resolves.toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], expect.objectContaining({ queryParams: { returnUrl: '/users' } }));
  });

  it('allows the route when the catalog action passes', async () => {
    allows.mockReturnValue(true);
    await expect(run('users.view')).resolves.toBe(true);
    expect(allows).toHaveBeenCalledWith('users.view');
  });

  it('redirects when the action is missing or denied', async () => {
    await expect(run(undefined)).resolves.toBe(false);
    expect(navigate).toHaveBeenCalledWith(
      ['/dashboard'],
      expect.objectContaining({ queryParams: expect.objectContaining({ error: 'forbidden' }) })
    );
  });
});
