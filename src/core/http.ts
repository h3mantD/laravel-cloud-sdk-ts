import type { FetchLike, NormalizedLaravelCloudClientConfig } from './config';
import { createLaravelCloudHttpError, LaravelCloudConfigError, LaravelCloudTransportError } from './errors';
import { serializeQuery } from './query';
import { decodeResponse, decodeResponseBody } from './response';
import type { HttpMethod, HttpRequestOptions, QueryObject } from './types';

const defaultAcceptHeader = 'application/json, application/vnd.api+json';

export class HttpClient {
  readonly #config: NormalizedLaravelCloudClientConfig;

  constructor(config: NormalizedLaravelCloudClientConfig) {
    this.#config = config;
  }

  async request<TBody = unknown>(method: HttpMethod, path: string, options: HttpRequestOptions = {}): Promise<TBody | undefined> {
    const request = await this.createRequest(method, path, options);
    const fetch = this.resolveFetch();

    try {
      await this.#config.onRequest?.({ request });

      const response = await fetch(request, { signal: request.signal });

      await this.#config.onResponse?.({ request, response });

      if (!response.ok) {
        await this.throwHttpError(response);
      }

      return await decodeResponse<TBody>(response);
    } catch (error) {
      await this.#config.onError?.({ request, error });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LaravelCloudTransportError('Laravel Cloud request was aborted', { cause: error });
      }

      if (error instanceof LaravelCloudTransportError || error instanceof LaravelCloudConfigError) {
        throw error;
      }

      if (error instanceof Error && error.name.startsWith('LaravelCloud')) {
        throw error;
      }

      throw new LaravelCloudTransportError('Laravel Cloud request failed before receiving a response', { cause: error });
    }
  }

  get<TBody = unknown>(path: string, options: Omit<HttpRequestOptions, 'body'> = {}): Promise<TBody | undefined> {
    return this.request<TBody>('GET', path, options);
  }

  post<TBody = unknown>(path: string, options: HttpRequestOptions = {}): Promise<TBody | undefined> {
    return this.request<TBody>('POST', path, options);
  }

  put<TBody = unknown>(path: string, options: HttpRequestOptions = {}): Promise<TBody | undefined> {
    return this.request<TBody>('PUT', path, options);
  }

  patch<TBody = unknown>(path: string, options: HttpRequestOptions = {}): Promise<TBody | undefined> {
    return this.request<TBody>('PATCH', path, options);
  }

  delete<TBody = unknown>(path: string, options: Omit<HttpRequestOptions, 'body'> = {}): Promise<TBody | undefined> {
    return this.request<TBody>('DELETE', path, options);
  }

  private async createRequest(method: HttpMethod, path: string, options: HttpRequestOptions): Promise<Request> {
    const headers = new Headers(this.#config.headers);
    const body = prepareRequestBody(headers, options.body);

    mergeHeaders(headers, options.headers);
    headers.set('accept', headers.get('accept') ?? defaultAcceptHeader);

    if (this.#config.auth !== false) {
      headers.set('authorization', `Bearer ${await this.#config.auth.getToken()}`);
    }

    return new Request(composeUrl(this.#config.baseUrl, path, options.query), {
      body,
      headers,
      method,
      signal: createRequestSignal(options.signal, options.timeout ?? this.#config.timeout),
    });
  }

  private resolveFetch(): FetchLike {
    if (this.#config.fetch === undefined) {
      throw new LaravelCloudConfigError('Laravel Cloud HTTP client requires a fetch implementation');
    }

    return this.#config.fetch;
  }

  private async throwHttpError(response: Awaited<ReturnType<FetchLike>>): Promise<never> {
    const decoded = await decodeResponseBody(response);

    throw createLaravelCloudHttpError({
      status: response.status,
      headers: headersToRecord(response.headers),
      body: decoded.body,
      rawBody: decoded.rawBody,
    });
  }
}

function composeUrl(baseUrl: string, path: string, query: QueryObject | undefined): string {
  const url = new URL(isAbsoluteUrl(path) ? path : path.replace(/^\/+/, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const serializedQuery = serializeQuery(query);

  if (serializedQuery.length > 0) {
    const prefix = url.search.length > 0 ? '&' : '';

    url.search = `${url.search}${prefix}${serializedQuery}`;
  }

  return url.toString();
}

function isAbsoluteUrl(path: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(path);
}

function prepareRequestBody(headers: Headers, body: HttpRequestOptions['body']): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (isPlainJsonBody(body)) {
    headers.set('content-type', headers.get('content-type') ?? 'application/json');

    return JSON.stringify(body);
  }

  return body;
}

function isPlainJsonBody(body: HttpRequestOptions['body']): body is QueryObject {
  return typeof body === 'object' && body !== null && body.constructor === Object;
}

function mergeHeaders(headers: Headers, overrideHeaders: HeadersInit | undefined): void {
  if (overrideHeaders === undefined) {
    return;
  }

  for (const [key, value] of new Headers(overrideHeaders)) {
    headers.set(key, value);
  }
}

function createRequestSignal(signal: AbortSignal | undefined, timeout: number | undefined): AbortSignal | undefined {
  if (timeout === undefined) {
    return signal;
  }

  const timeoutSignal = AbortSignal.timeout(timeout);

  if (signal === undefined || signal.aborted) {
    return signal ?? timeoutSignal;
  }

  if (timeoutSignal.aborted) {
    return timeoutSignal;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  signal.addEventListener('abort', abort, { once: true });
  timeoutSignal.addEventListener('abort', abort, { once: true });

  return controller.signal;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers) {
    result[key] = value;
  }

  return result;
}
