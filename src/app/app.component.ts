import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationDialogHostComponent, ToastContainerComponent } from '@shared/components';
import { AppState } from '@core/store';
import * as AuthActions from '@core/store/auth/auth.actions';
import { AuthService } from '@core/services/auth.service';
import { AppPageTitleService } from '@core/services/app-page-title.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmationDialogHostComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly store = inject(Store<AppState>);
  private readonly authService = inject(AuthService);
  private readonly pageTitle = inject(AppPageTitleService);

  ngOnInit(): void {
    this.pageTitle.init();
    if (this.authService.isAuthenticated()) {
      this.store.dispatch(AuthActions.loadUser());
    }
  }
}

