import { LaravelCloudConfigError } from './errors';

export const DEFAULT_LARAVEL_CLOUD_BASE_URL = 'https://cloud.laravel.com/api';

export interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: Headers;
  text(): Promise<string>;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<FetchLikeResponse>;

export type LaravelCloudTokenProvider = () => string | Promise<string>;

export interface LaravelCloudRequestHookContext {
  readonly request: Request;
}

export interface LaravelCloudResponseHookContext {
  readonly request: Request;
  readonly response: FetchLikeResponse;
}

export interface LaravelCloudErrorHookContext {
  readonly request: Request;
  readonly error: unknown;
}

export type LaravelCloudRequestHook = (context: LaravelCloudRequestHookContext) => void | Promise<void>;

export type LaravelCloudResponseHook = (context: LaravelCloudResponseHookContext) => void | Promise<void>;

export type LaravelCloudErrorHook = (context: LaravelCloudErrorHookContext) => void | Promise<void>;

export interface LaravelCloudClientOptions {
  readonly token?: string;
  readonly getToken?: LaravelCloudTokenProvider;
  readonly auth?: false;
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
  readonly timeout?: number;
  readonly headers?: HeadersInit;
  readonly onRequest?: LaravelCloudRequestHook;
  readonly onResponse?: LaravelCloudResponseHook;
  readonly onError?: LaravelCloudErrorHook;
}

export interface NormalizedLaravelCloudClientAuthConfig {
  readonly getToken: LaravelCloudTokenProvider;
}

export interface NormalizedLaravelCloudClientConfig {
  readonly auth: NormalizedLaravelCloudClientAuthConfig | false;
  readonly baseUrl: string;
  readonly fetch?: FetchLike;
  readonly timeout?: number;
  readonly headers?: HeadersInit;
  readonly onRequest?: LaravelCloudRequestHook;
  readonly onResponse?: LaravelCloudResponseHook;
  readonly onError?: LaravelCloudErrorHook;
}

export function normalizeLaravelCloudClientConfig(
  options: LaravelCloudClientOptions = {},
): NormalizedLaravelCloudClientConfig {
  return {
    auth: normalizeAuthConfig(options),
    baseUrl: options.baseUrl ?? DEFAULT_LARAVEL_CLOUD_BASE_URL,
    fetch: options.fetch ?? globalThis.fetch?.bind(globalThis),
    timeout: options.timeout,
    headers: options.headers,
    onRequest: options.onRequest,
    onResponse: options.onResponse,
    onError: options.onError,
  };
}

function normalizeAuthConfig(options: LaravelCloudClientOptions): NormalizedLaravelCloudClientConfig['auth'] {
  if (options.auth === false) {
    return false;
  }

  if (options.getToken !== undefined) {
    return { getToken: options.getToken };
  }

  if (options.token !== undefined) {
    return { getToken: () => options.token ?? '' };
  }

  throw new LaravelCloudConfigError('Laravel Cloud authentication requires a token or getToken provider');
}
