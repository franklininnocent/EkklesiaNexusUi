import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import {
  APP_LOGIN_DOCUMENT_TITLE,
  AppPageTitleService,
} from './app-page-title.service';

describe('AppPageTitleService', () => {
  let service: AppPageTitleService;
  let title: Title;
  const events$ = new Subject<unknown>();
  const auth = { isAuthenticated: jest.fn() };

  const routerStub: {
    url: string;
    events: typeof events$;
    routerState: { snapshot: { root: unknown } };
  } = {
    url: '/dashboard',
    events: events$,
    routerState: {
      snapshot: {
        root: {
          firstChild: {
            firstChild: null,
            url: [{ path: 'dashboard' }],
            data: {},
          },
          url: [],
          data: {},
        },
      },
    },
  };

  beforeEach(() => {
    auth.isAuthenticated.mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        AppPageTitleService,
        Title,
        { provide: Router, useValue: routerStub },
        { provide: AuthService, useValue: auth },
      ],
    });
    service = TestBed.inject(AppPageTitleService);
    title = TestBed.inject(Title);
  });

  it('sets login title on auth routes', () => {
    routerStub.url = '/auth/login';
    service.init();
    expect(title.getTitle()).toBe(APP_LOGIN_DOCUMENT_TITLE);
  });

  it('sets branded title for authenticated sacrament record route', () => {
    routerStub.url = '/sacraments/view/560';
    routerStub.routerState.snapshot.root = {
      firstChild: {
        firstChild: {
          firstChild: {
            firstChild: null,
            url: [{ path: 'view' }, { path: '560' }],
            data: { breadcrumbLabel: 'Record', pageTitle: 'Sacrament record' },
          },
          url: [{ path: 'sacraments' }],
          data: {},
        },
        url: [],
        data: {},
      },
      url: [],
      data: {},
    };
    service.init();
    events$.next(new NavigationEnd(1, '/sacraments/view/560', '/sacraments/view/560'));
    expect(title.getTitle()).toBe('Sacrament record — EkklesiaNexus');
  });

  it('uses login title when unauthenticated outside auth routes', () => {
    auth.isAuthenticated.mockReturnValue(false);
    routerStub.url = '/sacraments/view/560';
    service.init();
    expect(title.getTitle()).toBe(APP_LOGIN_DOCUMENT_TITLE);
  });
});
