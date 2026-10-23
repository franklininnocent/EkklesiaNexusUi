import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContactEnquiriesPage } from './contact-enquiries.page';
import { WebSettingsApiService } from '../services/web-settings.service';
import { AuthService } from '@core/services/auth.service';
import { ContactEnquiryRow } from '../models/web-settings.models';

const row: ContactEnquiryRow = {
  id: '11111111-1111-4111-8111-111111111111',
  reference_number: 'ENQ-1',
  full_name: 'Jane Visitor',
  email: 'visitor@example.com',
  phone: '+1 555 0100',
  organisation: 'St Mary Parish',
  subject: 'Demo request',
  enquiry_status: 'unread',
  delivery_status: 'received',
  delivery_attempts: 0,
  last_delivered_at: null,
  last_delivered_at_label: '',
  last_delivery_error: null,
  submitted_at: '2026-10-17T10:00:00+00:00',
  submitted_at_label: '17 Oct 2026, 10:00 AM',
  read_at: null,
  can_retry_email: false,
};

describe('ContactEnquiriesPage', () => {
  it('loads enquiry details into the modal', () => {
    const detail: ContactEnquiryRow = {
      ...row,
      message: 'Please contact us about parish onboarding.',
    };

    TestBed.configureTestingModule({
      imports: [ContactEnquiriesPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            canViewContactEnquiries: () => true,
            canUpdateContactEnquiries: () => true,
            canRetryContactEnquiryEmail: () => false,
            canDeleteContactEnquiries: () => false,
          },
        },
        {
          provide: WebSettingsApiService,
          useValue: {
            listEnquiries: () =>
              of({
                rows: [row],
                meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
              }),
            getEnquiry: () => of(detail),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ContactEnquiriesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.openDetail(row);
    fixture.detectChanges();

    expect(page.detailLoading).toBe(false);
    expect(page.selected?.message).toBe('Please contact us about parish onboarding.');
    expect(page.displayField(page.selected?.organisation)).toBe('St Mary Parish');
    expect(page.displayField(page.selected?.subject)).toBe('Demo request');
    expect(page.displayField(page.selected?.message)).toBe('Please contact us about parish onboarding.');
  });

  it('calls deleteEnquiry after confirming single delete', () => {
    const deleteEnquiry = jest.fn(() => of(undefined));
    const listEnquiries = jest.fn(() =>
      of({
        rows: [row],
        meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
      }),
    );

    TestBed.configureTestingModule({
      imports: [ContactEnquiriesPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            canViewContactEnquiries: () => true,
            canUpdateContactEnquiries: () => false,
            canRetryContactEnquiryEmail: () => false,
            canDeleteContactEnquiries: () => true,
          },
        },
        {
          provide: WebSettingsApiService,
          useValue: {
            listEnquiries,
            deleteEnquiry,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ContactEnquiriesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.requestDelete(row);
    page.onConfirmDelete({ confirmed: true });
    fixture.detectChanges();

    expect(deleteEnquiry).toHaveBeenCalledWith(row.id);
    expect(page.success).toBe('Enquiry deleted.');
  });

  it('calls bulkDeleteEnquiries with selected ids after confirming bulk delete', () => {
    const bulkDeleteEnquiries = jest.fn(() => of({ deleted_count: 1 }));
    const listEnquiries = jest.fn(() =>
      of({
        rows: [row],
        meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
      }),
    );

    TestBed.configureTestingModule({
      imports: [ContactEnquiriesPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            canViewContactEnquiries: () => true,
            canUpdateContactEnquiries: () => false,
            canRetryContactEnquiryEmail: () => false,
            canDeleteContactEnquiries: () => true,
          },
        },
        {
          provide: WebSettingsApiService,
          useValue: {
            listEnquiries,
            bulkDeleteEnquiries,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ContactEnquiriesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.toggleRowSelection(row, new Event('click'));
    page.requestBulkDelete();
    page.onConfirmDelete({ confirmed: true });
    fixture.detectChanges();

    expect(bulkDeleteEnquiries).toHaveBeenCalledWith([row.id]);
    expect(page.success).toBe('1 enquiry deleted.');
    expect(page.selectedCount).toBe(0);
  });

  it('shows row delete and bulk delete when permitted', () => {
    TestBed.configureTestingModule({
      imports: [ContactEnquiriesPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            canViewContactEnquiries: () => true,
            canUpdateContactEnquiries: () => false,
            canRetryContactEnquiryEmail: () => false,
            canDeleteContactEnquiries: () => true,
          },
        },
        {
          provide: WebSettingsApiService,
          useValue: {
            listEnquiries: () =>
              of({
                rows: [row],
                meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
              }),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ContactEnquiriesPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(root.querySelector('app-cf-action-icon')).toBeTruthy();
  });

  it('surfaces detail load failures in the modal', () => {
    TestBed.configureTestingModule({
      imports: [ContactEnquiriesPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            canViewContactEnquiries: () => true,
            canUpdateContactEnquiries: () => false,
            canRetryContactEnquiryEmail: () => false,
            canDeleteContactEnquiries: () => false,
          },
        },
        {
          provide: WebSettingsApiService,
          useValue: {
            listEnquiries: () =>
              of({
                rows: [row],
                meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
              }),
            getEnquiry: () => throwError(() => ({ error: { message: 'Forbidden.' } })),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ContactEnquiriesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.openDetail(row);
    fixture.detectChanges();

    expect(page.detailError).toBe('Forbidden.');
  });
});
