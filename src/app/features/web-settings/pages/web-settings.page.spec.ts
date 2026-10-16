import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { WebSettingsPage } from './web-settings.page';
import { WebSettingsApiService } from '../services/web-settings.service';
import { AuthService } from '@core/services/auth.service';

describe('WebSettingsPage', () => {
  it('loads settings into the form', () => {
    TestBed.configureTestingModule({
      imports: [WebSettingsPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            canUpdateWebSettings: () => true,
          },
        },
        {
          provide: WebSettingsApiService,
          useValue: {
            getSettings: () =>
              of({
                contact_recipient_email: 'contact@ekklesianexus.com',
                contact_form_enabled: true,
                captcha_enabled: true,
                captcha_ttl_seconds: 300,
                enquiry_retention_days: 730,
                diagnostics: {
                  recipient_configured: true,
                  transport_ready: true,
                  captcha_enabled: true,
                  contact_form_enabled: true,
                  captcha_ttl_seconds: 300,
                  mailer: 'array',
                  from_address_configured: true,
                  from_name_configured: true,
                  queue_connection: 'sync',
                  smtp_host_configured: true,
                  smtp_port: 587,
                  smtp_username_configured: false,
                  smtp_password_configured: false,
                },
              }),
            saveSettings: () => of({}),
            sendTestEmail: () => of('ok'),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(WebSettingsPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.form.controls.contact_recipient_email.value).toBe('contact@ekklesianexus.com');
    expect(page.loaded).toBe(true);
  });
});
