import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { tenantInterceptor } from '@core/interceptors/tenant.interceptor';
import { IdleMarkedPreloadStrategy } from '@core/routing/idle-marked-preload.strategy';
import { environment } from '@environments/environment';
import { metaReducers, reducers } from '@core/store';
import { AuthEffects } from '@core/store/auth/auth.effects';
import { TenantEffects } from '@core/store/tenant/tenant.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(IdleMarkedPreloadStrategy)),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        tenantInterceptor,
        errorInterceptor
      ])
    ),
    provideAnimationsAsync(),
    provideStore(reducers, { metaReducers }),
    provideEffects([AuthEffects, TenantEffects]),
    ...(environment.enableDevTools
      ? [
          provideStoreDevtools({
            maxAge: 25,
            logOnly: environment.production,
          }),
        ]
      : []),
  ]
};
