import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Preloads only routes marked `data.preload === true`, after a short idle delay
 * so the first authenticated view is not competing for bandwidth.
 */
@Injectable({ providedIn: 'root' })
export class IdleMarkedPreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] !== true) {
      return of(null);
    }

    return timer(3500).pipe(mergeMap(() => load()));
  }
}
