import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiErrorMessages, apiErrorMessage } from './api-error';

describe('ApiError', () => {
  it('uses the field message for a single validation error and hides generic summaries', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        message: 'The given data was invalid.',
        errors: { email: ['Enter a valid email address.'] },
      },
    });

    const api = ApiError.fromHttp(error);
    expect(api.category).toBe('validation');
    expect(api.message).toBe('Enter a valid email address.');
    expect(api.fieldErrors?.['email'][0]).toBe('Enter a valid email address.');
    expect(api.error?.errors?.['email'][0]).toBe('Enter a valid email address.');
  });

  it('strips SQL and stack traces from unexpected failures', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { message: 'SQLSTATE[23505]: duplicate key value violates unique constraint users_email_key' },
    });

    const api = ApiError.fromHttp(error);
    expect(api.message).toBe(ApiErrorMessages.unexpected);
    expect(api.message).not.toContain('SQLSTATE');
    expect(api.message).not.toContain('users_email_key');
  });

  it('distinguishes a lost connection from an application error', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error', error: null });
    expect(ApiError.fromHttp(error).message).toBe(ApiErrorMessages.offline);
  });

  it('uses an ambiguous transaction message for a financial write with no response', () => {
    const error = new HttpErrorResponse({ status: 0, url: '/api/donations/payments', error: null });
    const request = { method: 'POST', url: '/api/donations/payments' } as never;
    const api = ApiError.fromHttp(error, request);
    expect(api.message).toBe(ApiErrorMessages.ambiguousTransaction);
  });

  it('reads the flattened interceptor shape and a raw HttpErrorResponse', () => {
    const flattened = apiErrorMessage({ status: 403, message: 'You cannot delete this role.', code: 'FORBIDDEN' });
    expect(flattened).toBe('You cannot delete this role.');

    const raw = apiErrorMessage(new HttpErrorResponse({
      status: 404,
      error: { message: 'Resource not found' },
    }));
    expect(raw).toBe(ApiErrorMessages.notFound);
  });

  it('prefers a specific safe API message over a generic operation fallback', () => {
    const message = apiErrorMessage(
      { status: 409, message: 'A record with these details already exists. Review the existing record before creating another.' },
      'Failed to save record.'
    );
    expect(message).toContain('already exists');
    expect(message).not.toContain('Failed to save');
  });

  it('uses the operation fallback when the server gives no safe explanation', () => {
    const message = apiErrorMessage(
      new HttpErrorResponse({ status: 500, error: { message: 'SQLSTATE[23505]: duplicate key' } }),
      'Failed to save record.'
    );
    expect(message).toBe('Failed to save record.');
    expect(message).not.toContain('SQLSTATE');
  });

  it('does not toast again when the interceptor already handled the failure', () => {
    const handled = new ApiError({
      message: 'Donations are not in your plan.',
      category: 'subscription',
      status: 403,
      code: 'FEATURE_NOT_AVAILABLE',
      handled: true,
    });
    expect(apiErrorMessage(handled, 'Failed to save.')).toBe('');
  });
});
