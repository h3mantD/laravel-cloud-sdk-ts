import { describe, expect, it } from 'vitest';

import {
  createLaravelCloudHttpError,
  LaravelCloudAuthenticationError,
  LaravelCloudAuthorizationError,
  LaravelCloudConfigError,
  LaravelCloudConfirmationError,
  LaravelCloudHttpError,
  LaravelCloudNotFoundError,
  LaravelCloudTransportError,
  LaravelCloudValidationError,
} from '../../src/index';

describe('Laravel Cloud errors', () => {
  it('maps 401 responses to authentication errors without leaking tokens', () => {
    const error = createLaravelCloudHttpError({
      status: 401,
      headers: { 'www-authenticate': 'Bearer' },
      body: { message: 'Token lc_secret_token_123 is invalid' },
      rawBody: '{"message":"Token lc_secret_token_123 is invalid"}',
    });

    expect(error).toBeInstanceOf(LaravelCloudAuthenticationError);
    expect(error.status).toBe(401);
    expect(error.headers).toEqual({ 'www-authenticate': 'Bearer' });
    expect(error.body).toEqual({ message: 'Token lc_secret_token_123 is invalid' });
    expect(error.rawBody).not.toContain('lc_secret_token_123');
    expect(error.message).not.toContain('lc_secret_token_123');
    expect(String(error)).not.toContain('lc_secret_token_123');
  });

  it('maps 403 responses to authorization errors', () => {
    const error = createLaravelCloudHttpError({
      status: 403,
      headers: {},
      body: { message: 'Forbidden' },
      rawBody: '{"message":"Forbidden"}',
    });

    expect(error).toBeInstanceOf(LaravelCloudAuthorizationError);
    expect(error.status).toBe(403);
    expect(error.message).toBe('Forbidden');
  });

  it('maps 404 responses to not found errors', () => {
    const error = createLaravelCloudHttpError({
      status: 404,
      headers: {},
      body: { message: 'Application not found' },
      rawBody: '{"message":"Application not found"}',
    });

    expect(error).toBeInstanceOf(LaravelCloudNotFoundError);
    expect(error.status).toBe(404);
    expect(error.message).toBe('Application not found');
  });

  it('maps 422 responses to validation errors with field access', () => {
    const validationErrors = {
      name: ['The name field is required.'],
      domains: ['The selected domain is invalid.'],
    };

    const error = createLaravelCloudHttpError({
      status: 422,
      headers: { 'content-type': 'application/json' },
      body: {
        message: 'The given data was invalid.',
        errors: validationErrors,
      },
      rawBody: JSON.stringify({
        message: 'The given data was invalid.',
        errors: validationErrors,
      }),
    });

    expect(error).toBeInstanceOf(LaravelCloudValidationError);
    if (!(error instanceof LaravelCloudValidationError)) {
      throw new Error('Expected validation error');
    }

    expect(error.status).toBe(422);
    expect(error.errors).toEqual(validationErrors);
  });

  it('maps other HTTP responses to generic HTTP errors', () => {
    const error = createLaravelCloudHttpError({
      status: 500,
      headers: { 'x-request-id': 'request_123' },
      body: { message: 'Server error' },
      rawBody: '{"message":"Server error"}',
    });

    expect(error).toBeInstanceOf(LaravelCloudHttpError);
    expect(error).not.toBeInstanceOf(LaravelCloudValidationError);
    expect(error.status).toBe(500);
    expect(error.headers).toEqual({ 'x-request-id': 'request_123' });
  });

  it('handles non-JSON response bodies safely', () => {
    const error = createLaravelCloudHttpError({
      status: 500,
      headers: { 'content-type': 'text/html' },
      body: undefined,
      rawBody: '<html>lc_secret_token_123 failed</html>',
    });

    expect(error).toBeInstanceOf(LaravelCloudHttpError);
    expect(error.body).toBeUndefined();
    expect(error.rawBody).toBe('<html>[REDACTED] failed</html>');
    expect(error.message).toBe('Laravel Cloud request failed with status 500');
  });

  it('constructs transport, config, and confirmation errors', () => {
    const cause = new Error('network unreachable');

    expect(new LaravelCloudTransportError('Network failed', { cause }).cause).toBe(cause);
    expect(new LaravelCloudConfigError('Missing API token')).toBeInstanceOf(Error);
    expect(new LaravelCloudConfirmationError('Confirmation required')).toBeInstanceOf(Error);
  });
});
