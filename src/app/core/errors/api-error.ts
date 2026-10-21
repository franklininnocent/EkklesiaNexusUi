import { HttpErrorResponse, HttpRequest } from '@angular/common/http';

export type ApiErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'subscription'
  | 'rate_limit'
  | 'network'
  | 'business_rule'
  | 'unexpected';

export const ApiErrorMessages = {
  sessionExpired: 'Your session has expired. Please sign in again to continue.',
  forbidden: 'You do not have permission to perform this action. Please contact your parish administrator if you need access.',
  notFound: 'The requested record could not be found. It may have been removed or may no longer be available.',
  validationSummary: 'Review the highlighted fields and correct the information.',
  duplicate: 'A record with these details already exists. Review the existing record before creating another.',
  conflict: 'This record has been updated by another user. Refresh it to review the latest information before saving your changes.',
  rateLimited: 'Too many requests. Please wait a moment and try again.',
  offline: 'We could not connect to the server. Check your internet connection and try again.',
  timeout: 'The server did not respond in time. Please try again shortly.',
  unexpected: "We couldn't complete your request due to an unexpected problem. Please try again shortly. If the problem continues, contact support.",
  ambiguousTransaction: "We couldn't confirm whether the transaction completed. Check the transaction register before trying again.",
  loginInvalid: 'The email address or password is incorrect. Please check your details and try again.',
} as const;

const SUBSCRIPTION_CODES = new Set([
  'FEATURE_NOT_AVAILABLE',
  'ENTITLEMENT_LIMIT_REACHED',
  'SUBSCRIPTION_VIEW_ONLY',
  'SUBSCRIPTION_LOCKED',
  'SUBSCRIPTION_READ_ONLY',
  'SUBSCRIPTION_EXPIRED',
]);

const GENERIC_MESSAGES = new Set([
  'something went wrong',
  'something went wrong. please try again.',
  'an error occurred',
  'an unknown error occurred',
  'request failed',
  'request failed.',
  'bad request',
  'validation error',
  'validation failed',
  'the given data was invalid.',
  'resource not found',
  'internal server error. please try again later.',
  'internal server error.',
  'internal server error',
  'invalid',
  'invalid.',
  'server error',
  'forbidden',
  'forbidden.',
  'unauthorized',
  'unauthorized. please login again.',
  'unauthenticated.',
  'unauthenticated',
]);

export class ApiError extends Error {
  override name = 'ApiError';
  category: ApiErrorCategory;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  /** Same field map as `fieldErrors`, kept for existing callers. */
  errors?: Record<string, string[]>;
  status: number;
  requestId?: string;
  reason?: string;
  context?: unknown;
  feature?: string;
  limit?: number;
  current_usage?: number;
  subscription_status?: string;
  /** Legacy body shape (`error.message`, `error.errors`) used by existing screens. */
  error?: {
    message?: string;
    errors?: Record<string, string[]>;
    code?: string;
    reason?: string;
    context?: unknown;
  };
  /** True when the interceptor already showed the user a toast or dialog. */
  handled = false;

  constructor(init: {
    message: string;
    category: ApiErrorCategory;
    status?: number;
    code?: string;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
    reason?: string;
    context?: unknown;
    feature?: string;
    limit?: number;
    current_usage?: number;
    subscription_status?: string;
    handled?: boolean;
  }) {
    super(init.message);
    this.category = init.category;
    this.status = init.status ?? 0;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors;
    this.errors = init.fieldErrors;
    this.requestId = init.requestId;
    this.reason = init.reason;
    this.context = init.context;
    this.feature = init.feature;
    this.limit = init.limit;
    this.current_usage = init.current_usage;
    this.subscription_status = init.subscription_status;
    this.handled = init.handled ?? false;
    this.error = {
      message: init.message,
      errors: init.fieldErrors,
      code: init.code,
      reason: init.reason,
      context: init.context as never,
    };
  }

  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      return ApiError.fromHttp(error);
    }
    if (error instanceof Error) {
      return new ApiError({
        message: ApiErrorMessages.unexpected,
        category: 'unexpected',
        status: 0,
      });
    }
    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;
      const status = typeof record['status'] === 'number' ? record['status'] : 0;
      const nested = record['error'];
      const body = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : record;
      return ApiError.fromParts(status, body, record);
    }
    if (typeof error === 'string' && error.trim() !== '') {
      return new ApiError({
        message: safeText(error, ApiErrorMessages.unexpected),
        category: 'unexpected',
        status: 0,
      });
    }
    return new ApiError({
      message: ApiErrorMessages.unexpected,
      category: 'unexpected',
      status: 0,
    });
  }

  static fromHttp(error: HttpErrorResponse, request?: HttpRequest<unknown>): ApiError {
    const body = error.error && typeof error.error === 'object' ? (error.error as Record<string, unknown>) : {};
    const api = ApiError.fromParts(error.status, body, body);
    if (request && isFinancialMutation(request) && (error.status === 0 || error.status === 504)) {
      api.message = ApiErrorMessages.ambiguousTransaction;
      api.category = 'network';
      if (api.error) {
        api.error = { ...api.error, message: api.message };
      }
    }
    return api;
  }

  private static fromParts(status: number, body: Record<string, unknown>, flat: Record<string, unknown>): ApiError {
    const code = stringValue(body['code']) || stringValue(flat['code']);
    const reason = stringValue(body['reason']) || stringValue(flat['reason']);
    const fieldErrors = normalizeFieldErrors(body['errors'] ?? flat['errors']);
    const requestId = stringValue(body['request_id']) || stringValue(flat['requestId']) || stringValue(flat['request_id']);
    const rawMessage = stringValue(body['message']) || stringValue(flat['message']);
    const category = categorize(status, code, reason);
    const message = chooseMessage(status, category, rawMessage, fieldErrors);

    return new ApiError({
      message,
      category,
      status,
      code,
      fieldErrors,
      requestId,
      reason,
      context: body['context'] ?? flat['context'],
      feature: stringValue(body['feature']) || stringValue(flat['feature']),
      limit: numberValue(body['limit'] ?? flat['limit']),
      current_usage: numberValue(body['current_usage'] ?? flat['current_usage']),
      subscription_status: stringValue(body['subscription_status']) || stringValue(flat['subscription_status']),
    });
  }
}

export function apiErrorMessage(error: unknown, fallback?: string): string {
  const api = ApiError.fromUnknown(error);
  if (api.handled) {
    return '';
  }
  if (api.message && !isGeneric(api.message)) {
    if (fallback && !isGeneric(fallback) && api.message === ApiErrorMessages.unexpected) {
      return fallback;
    }
    return api.message;
  }
  return fallback && !isGeneric(fallback) ? fallback : api.message || ApiErrorMessages.unexpected;
}

export function isTechnicalMessage(message: string): boolean {
  return isUnsafe(message);
}

function categorize(status: number, code?: string, reason?: string): ApiErrorCategory {
  if (status === 0) return 'network';
  if (code && SUBSCRIPTION_CODES.has(code)) return 'subscription';
  if (reason === 'subscription_blocked') return 'subscription';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'network';
  if (status >= 500 || status === 0) return 'unexpected';
  if (code === 'BUSINESS_RULE' || code === 'DUPLICATE') return code === 'DUPLICATE' ? 'conflict' : 'business_rule';
  return status >= 400 ? 'business_rule' : 'unexpected';
}

function chooseMessage(
  status: number,
  category: ApiErrorCategory,
  rawMessage: string | undefined,
  fieldErrors?: Record<string, string[]>
): string {
  const flat = fieldErrors ? Object.values(fieldErrors).flat() : [];
  const safeRaw = rawMessage && !isUnsafe(rawMessage) && !isGeneric(rawMessage) ? rawMessage : undefined;

  if (category === 'validation') {
    if (safeRaw) return safeRaw;
    if (flat.length === 1 && !isUnsafe(flat[0])) return flat[0];
    return ApiErrorMessages.validationSummary;
  }

  if (safeRaw) return safeRaw;

  switch (category) {
    case 'authentication':
      return ApiErrorMessages.sessionExpired;
    case 'authorization':
      return ApiErrorMessages.forbidden;
    case 'not_found':
      return ApiErrorMessages.notFound;
    case 'conflict':
      return status === 409 && rawMessage && /already exists|duplicate/i.test(rawMessage) && !isUnsafe(rawMessage)
        ? ApiErrorMessages.duplicate
        : ApiErrorMessages.conflict;
    case 'rate_limit':
      return ApiErrorMessages.rateLimited;
    case 'network':
      return status === 504 || status === 408 ? ApiErrorMessages.timeout : ApiErrorMessages.offline;
    case 'subscription':
      return safeRaw || 'This action is not available on your current subscription. Contact your administrator to review the available options.';
    default:
      return status >= 500 || status === 0 ? ApiErrorMessages.unexpected : ApiErrorMessages.unexpected;
  }
}

function normalizeFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      const text = messages.filter((item) => typeof item === 'string' && item.trim() !== '') as string[];
      if (text.length) out[key] = text.map((item) => (isUnsafe(item) ? ApiErrorMessages.validationSummary : item));
    } else if (typeof messages === 'string' && messages.trim() !== '') {
      out[key] = [isUnsafe(messages) ? ApiErrorMessages.validationSummary : messages];
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function isFinancialMutation(request: HttpRequest<unknown>): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return false;
  }
  return /\/(donations|payments|refunds|receipts|offerings|billing|checkout|collections)\b/i.test(request.url);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function isGeneric(message: string): boolean {
  return GENERIC_MESSAGES.has(message.trim().toLowerCase());
}

function isUnsafe(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'sqlstate',
    'sql syntax',
    'duplicate key',
    'stack trace',
    'stacktrace',
    'vendor/',
    'illuminate\\',
    'pdoexception',
    'queryexception',
    '.php',
    '/var/',
    'token generation failed',
    'undefined array',
    'undefined variable',
    'trying to get',
    'call to a member',
    'call to undefined',
    'must be of type',
  ].some((needle) => normalized.includes(needle));
}

function safeText(message: string, fallback: string): string {
  const trimmed = message.trim();
  if (!trimmed || isUnsafe(trimmed) || isGeneric(trimmed)) {
    return fallback;
  }
  return trimmed;
}
