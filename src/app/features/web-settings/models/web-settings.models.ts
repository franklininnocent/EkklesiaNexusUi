export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface WebSettingsDiagnostics {
  contact_form_enabled: boolean;
  captcha_enabled: boolean;
  captcha_ttl_seconds: number;
  recipient_configured: boolean;
  mailer: string;
  from_address_configured: boolean;
  from_name_configured: boolean;
  queue_connection: string;
  api_key_configured: boolean;
  smtp_host_configured: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username_configured: boolean;
  smtp_password_configured: boolean;
  transport_ready: boolean;
  mailer_writes_to_log_only?: boolean;
  contact_email_will_deliver?: boolean;
  failed_delivery_count?: number;
  stuck_received_count?: number;
}

export interface WebSettingsPayload {
  contact_recipient_email: string;
  contact_form_enabled: boolean;
  captcha_enabled: boolean;
  captcha_ttl_seconds: number;
  enquiry_retention_days: number;
  updated_at?: string;
  updated_at_label?: string;
  diagnostics?: WebSettingsDiagnostics;
}

export interface ContactEnquiryRow {
  id: string;
  reference_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  subject: string | null;
  enquiry_status: string;
  delivery_status: string;
  delivery_attempts: number;
  last_delivered_at: string | null;
  last_delivered_at_label: string;
  last_delivery_error: string | null;
  submitted_at: string;
  submitted_at_label: string;
  read_at: string | null;
  can_retry_email: boolean;
  message?: string;
  delivery_events?: Array<{
    status: string;
    attempt: number;
    detail: string | null;
    created_at: string;
    created_at_label: string;
  }>;
}

export interface ContactEnquiryListQuery {
  search?: string;
  enquiry_status?: string;
  delivery_status?: string;
  submitted_from?: string;
  submitted_to?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
