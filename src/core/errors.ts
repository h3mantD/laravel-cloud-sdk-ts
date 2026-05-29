import { redactSensitiveText } from './redact';

export type LaravelCloudHttpHeaders = Readonly<Record<string, string>>;

export type LaravelCloudValidationErrors = Readonly<Record<string, readonly string[]>>;

export interface LaravelCloudErrorOptions {
  readonly cause?: unknown;
}

export interface LaravelCloudHttpErrorOptions extends LaravelCloudErrorOptions {
  readonly status: number;
  readonly headers: LaravelCloudHttpHeaders;
  readonly body?: unknown;
  readonly rawBody?: string;
}

export interface CreateLaravelCloudHttpErrorOptions {
  readonly status: number;
  readonly headers?: LaravelCloudHttpHeaders;
  readonly body?: unknown;
  readonly rawBody?: string;
}

interface LaravelCloudMessageBody {
  readonly message?: unknown;
}

interface LaravelCloudValidationBody extends LaravelCloudMessageBody {
  readonly errors?: unknown;
}

export class LaravelCloudError extends Error {
  constructor(message: string, options: LaravelCloudErrorOptions = {}) {
    super(redactSensitiveText(message), { cause: options.cause });
    this.name = new.target.name;
  }
}

export class LaravelCloudConfigError extends LaravelCloudError {}

export class LaravelCloudTransportError extends LaravelCloudError {}

export class LaravelCloudConfirmationError extends LaravelCloudError {}

export class LaravelCloudHttpError extends LaravelCloudError {
  readonly status: number;
  readonly headers: LaravelCloudHttpHeaders;
  readonly body?: unknown;
  readonly rawBody?: string;

  constructor(message: string, options: LaravelCloudHttpErrorOptions) {
    super(message, options);
    this.status = options.status;
    this.headers = options.headers;
    this.body = options.body;
    this.rawBody = options.rawBody === undefined ? undefined : redactSensitiveText(options.rawBody);
  }
}

export class LaravelCloudAuthenticationError extends LaravelCloudHttpError {}

export class LaravelCloudAuthorizationError extends LaravelCloudHttpError {}

export class LaravelCloudNotFoundError extends LaravelCloudHttpError {}

export class LaravelCloudValidationError extends LaravelCloudHttpError {
  readonly errors: LaravelCloudValidationErrors;

  constructor(message: string, options: LaravelCloudHttpErrorOptions & { readonly errors: LaravelCloudValidationErrors }) {
    super(message, options);
    this.errors = options.errors;
  }
}

export function createLaravelCloudHttpError(options: CreateLaravelCloudHttpErrorOptions): LaravelCloudHttpError {
  const headers = options.headers ?? {};
  const message = extractHttpErrorMessage(options.status, options.body);
  const errorOptions = {
    status: options.status,
    headers,
    body: options.body,
    rawBody: options.rawBody,
  } satisfies LaravelCloudHttpErrorOptions;

  if (options.status === 401) {
    return new LaravelCloudAuthenticationError(message, errorOptions);
  }

  if (options.status === 403) {
    return new LaravelCloudAuthorizationError(message, errorOptions);
  }

  if (options.status === 404) {
    return new LaravelCloudNotFoundError(message, errorOptions);
  }

  if (options.status === 422) {
    return new LaravelCloudValidationError(message, {
      ...errorOptions,
      errors: extractValidationErrors(options.body),
    });
  }

  return new LaravelCloudHttpError(message, errorOptions);
}

function extractHttpErrorMessage(status: number, body: unknown): string {
  if (isMessageBody(body) && typeof body.message === 'string' && body.message.length > 0) {
    return body.message;
  }

  return `Laravel Cloud request failed with status ${status}`;
}

function extractValidationErrors(body: unknown): LaravelCloudValidationErrors {
  if (!isValidationBody(body) || !isValidationErrors(body.errors)) {
    return {};
  }

  return body.errors;
}

function isMessageBody(value: unknown): value is LaravelCloudMessageBody {
  return typeof value === 'object' && value !== null;
}

function isValidationBody(value: unknown): value is LaravelCloudValidationBody {
  return typeof value === 'object' && value !== null;
}

function isValidationErrors(value: unknown): value is LaravelCloudValidationErrors {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.values(value).every(
    (messages) => Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
  );
}
