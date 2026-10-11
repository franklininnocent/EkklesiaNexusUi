import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { WebSettingsApiService } from '../services/web-settings.service';
import { WebSettingsDiagnostics, WebSettingsPayload } from '../models/web-settings.models';

@Component({
  selector: 'app-web-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './web-settings.page.html',
  styleUrl: './web-settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSettingsPage implements OnInit, OnDestroy {
  private readonly api = inject(WebSettingsApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private snapshot = '';

  readonly canUpdate = this.auth.canUpdateWebSettings();
  loading = false;
  saving = false;
  testing = false;
  loaded = false;
  error: string | null = null;
  success: string | null = null;
  diagnostics: WebSettingsDiagnostics | null = null;

  form = this.fb.nonNullable.group({
    contact_recipient_email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    contact_form_enabled: [true],
    captcha_enabled: [true],
    captcha_ttl_seconds: [300, [Validators.required, Validators.min(60), Validators.max(900)]],
    enquiry_retention_days: [730, [Validators.required, Validators.min(30), Validators.max(3650)]],
  });

  ngOnInit(): void {
    if (!this.canUpdate) {
      this.form.disable();
    }
    this.reload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get dirty(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== this.snapshot;
  }

  reload(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.api
      .getSettings()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => this.apply(data),
        error: (err: HttpErrorResponse) => {
          this.error = err.error?.message ?? 'Unable to load web settings.';
        },
      });
  }

  save(): void {
    if (!this.canUpdate || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
    this.api
      .saveSettings(this.form.getRawValue())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this.apply(data);
          this.success = 'Web settings saved.';
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.error?.message ?? 'Unable to save web settings.';
        },
      });
  }

  cancel(): void {
    if (this.snapshot) {
      this.form.reset(JSON.parse(this.snapshot));
    }
    this.success = null;
    this.cdr.markForCheck();
  }

  sendTest(): void {
    if (this.testing || !this.canUpdate) {
      return;
    }
    this.testing = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
    this.api
      .sendTestEmail()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.testing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (message) => {
          this.success = message;
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.error?.message ?? 'Test email failed.';
        },
      });
  }

  private apply(data: WebSettingsPayload): void {
    const value = {
      contact_recipient_email: data.contact_recipient_email,
      contact_form_enabled: data.contact_form_enabled,
      captcha_enabled: data.captcha_enabled,
      captcha_ttl_seconds: data.captcha_ttl_seconds,
      enquiry_retention_days: data.enquiry_retention_days,
    };
    this.form.reset(value);
    this.snapshot = JSON.stringify(value);
    this.diagnostics = data.diagnostics ?? null;
    this.loaded = true;
  }
}
