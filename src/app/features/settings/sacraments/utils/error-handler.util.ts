/**
 * Sacrament screens share the application error model.
 * HTTP calls already pass through the error interceptor, which rethrows ApiError
 * rather than HttpErrorResponse.
 */

import { ApiError, apiErrorMessage } from '@core/errors/api-error';

export interface ErrorDetails {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, unknown>;
}

export function extractErrorMessage(error: unknown): string {
  return apiErrorMessage(error);
}

export function extractErrorDetails(error: unknown): ErrorDetails {
  const api = ApiError.fromUnknown(error);
  const field = api.fieldErrors ? Object.keys(api.fieldErrors)[0] : undefined;
  return {
    message: api.message,
    code: api.code || (api.status ? String(api.status) : undefined),
    field,
    details: api.fieldErrors,
  };
}

export function isValidationError(error: unknown): boolean {
  const api = ApiError.fromUnknown(error);
  return api.status === 422 && !!api.fieldErrors;
}

export function isNetworkError(error: unknown): boolean {
  const api = ApiError.fromUnknown(error);
  return api.status === 0 || api.category === 'network';
}

export function handleApiError(error: unknown, defaultMessage = 'We could not complete that request. Please try again.'): string {
  const message = apiErrorMessage(error, defaultMessage);
  console.error('API Error:', ApiError.fromUnknown(error).status, ApiError.fromUnknown(error).code || '');
  return message || defaultMessage;
}
