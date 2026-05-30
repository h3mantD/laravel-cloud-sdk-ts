import { describe, expect, it, vi } from 'vitest';

import {
  HttpClient,
  LaravelCloudHttpError,
  LaravelCloudTransportError,
  LaravelCloudValidationError,
  normalizeLaravelCloudClientConfig,
} from '../../src/index';
import type { FetchLike, FetchLikeResponse } from '../../src/index';
import type { LaravelCloudRequestHook, LaravelCloudResponseHook } from '../../src/index';

interface CapturedRequest {
  readonly input: string | URL | Request;
  readonly init?: RequestInit;
}

function fetchResponse(status: number, body: string, headers: HeadersInit = {}): FetchLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  };
}

function createFetch(response: FetchLikeResponse): { readonly captured: CapturedRequest[]; readonly fetch: FetchLike } {
  const captured: CapturedRequest[] = [];
  const fetch: FetchLike = (input, init) => {
    captured.push({ input, init });

    return Promise.resolve(response);
  };

  return { captured, fetch };
}

function requestFrom(captured: CapturedRequest): Request {
  expect(captured.input).toBeInstanceOf(Request);

  return captured.input as Request;
}

describe('HttpClient', () => {
  it('composes URLs, serializes queries, injects bearer auth, and returns raw JSON envelopes', async () => {
    const envelope = { data: [{ type: 'applications', id: 'app_123' }] };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/json' }));
    const client = new HttpClient(
      normalizeLaravelCloudClientConfig({
        token: 'lc_secret_token_123',
        baseUrl: 'https://cloud.laravel.com/api/',
        fetch,
      }),
    );

    await expect(
      client.request('GET', '/applications', {
        query: {
          filter: { name: 'Demo' },
          include: ['organization', 'environments'],
        },
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);

    expect(request.url).toBe(
      'https://cloud.laravel.com/api/applications?filter%5Bname%5D=Demo&include=organization,environments',
    );
    expect(request.headers.get('authorization')).toBe('Bearer lc_secret_token_123');
    expect(request.headers.get('accept')).toBe('application/json, application/vnd.api+json');
  });

  it('omits auth when auth is disabled', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, '{}', { 'content-type': 'application/json' }));
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ auth: false, fetch }));

    await client.request('GET', '/applications');

    expect(requestFrom(captured[0]!).headers.has('authorization')).toBe(false);
  });

  it('uses async token providers and merges configured and request headers', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, '{}', { 'content-type': 'application/json' }));
    const client = new HttpClient(
      normalizeLaravelCloudClientConfig({
        getToken: () => Promise.resolve('async-token'),
        fetch,
        headers: { 'x-client': 'sdk' },
      }),
    );

    await client.request('GET', '/applications', {
      headers: { 'x-request': 'request' },
    });

    const headers = requestFrom(captured[0]!).headers;

    expect(headers.get('authorization')).toBe('Bearer async-token');
    expect(headers.get('x-client')).toBe('sdk');
    expect(headers.get('x-request')).toBe('request');
  });

  it('rejects empty static tokens as configuration errors', () => {
    expect(() => normalizeLaravelCloudClientConfig({ token: '   ' })).toThrow('token must be a non-empty string');
  });

  it('rejects empty async token provider results before fetch', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = new HttpClient(
      normalizeLaravelCloudClientConfig({
        getToken: () => Promise.resolve(''),
        fetch,
      }),
    );

    await expect(client.request('GET', '/applications')).rejects.toThrow('token must be a non-empty string');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sets JSON content type only for plain JSON request bodies', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, '{}', { 'content-type': 'application/json' }));
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ token: 'test-token', fetch }));

    await client.request('POST', '/applications', {
      body: { name: 'Demo' },
    });

    const request = requestFrom(captured[0]!);

    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.text()).resolves.toBe('{"name":"Demo"}');
  });

  it('does not set JSON content type or stringify FormData bodies', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ token: 'test-token', fetch }));
    const formData = new FormData();

    formData.append('avatar', new Blob(['image']), 'avatar.png');

    await expect(client.request('POST', '/applications/app_123/avatar', { body: formData })).resolves.toBeUndefined();

    expect(requestFrom(captured[0]!).headers.get('content-type')).not.toBe('application/json');
  });

  it('calls request and response hooks', async () => {
    const { fetch } = createFetch(fetchResponse(200, '{}', { 'content-type': 'application/json' }));
    const onRequest = vi.fn<LaravelCloudRequestHook>();
    const onResponse = vi.fn<LaravelCloudResponseHook>();
    const client = new HttpClient(
      normalizeLaravelCloudClientConfig({
        token: 'test-token',
        fetch,
        onRequest,
        onResponse,
      }),
    );

    await client.request('GET', '/applications');

    expect(onRequest).toHaveBeenCalledOnce();
    expect(onResponse).toHaveBeenCalledOnce();
    expect(onResponse.mock.calls[0]?.[0].response.status).toBe(200);
  });

  it('supports request signals', async () => {
    const controller = new AbortController();
    const fetch = vi.fn<FetchLike>((_input, init) => {
      controller.abort();
      expect(init?.signal?.aborted).toBe(true);

      return Promise.resolve(fetchResponse(200, '{}', { 'content-type': 'application/json' }));
    });
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ token: 'test-token', fetch }));

    await client.request('GET', '/applications', { signal: controller.signal });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it('merges request signals with timeouts using Node 18-safe primitives', async () => {
    const originalAnyDescriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'any');
    const controller = new AbortController();
    let mergedSignal: AbortSignal | undefined;
    const fetch = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          mergedSignal = init?.signal ?? undefined;
          mergedSignal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
          controller.abort();
        }),
    );
    const client = new HttpClient(
      normalizeLaravelCloudClientConfig({
        token: 'test-token',
        fetch,
        timeout: 1_000,
      }),
    );

    try {
      Object.defineProperty(AbortSignal, 'any', { configurable: true, value: undefined });

      await expect(client.request('GET', '/applications', { signal: controller.signal })).rejects.toBeInstanceOf(
        LaravelCloudTransportError,
      );
    } finally {
      if (originalAnyDescriptor === undefined) {
        Reflect.deleteProperty(AbortSignal, 'any');
      } else {
        Object.defineProperty(AbortSignal, 'any', originalAnyDescriptor);
      }
    }

    expect(fetch).toHaveBeenCalledOnce();
    expect(mergedSignal).toBeInstanceOf(AbortSignal);
    expect(mergedSignal).not.toBe(controller.signal);
    expect(mergedSignal?.aborted).toBe(true);
  });

  it('aborts timed out requests and calls error hooks', async () => {
    const onError = vi.fn();
    const fetch = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
        }),
    );
    const client = new HttpClient(
      normalizeLaravelCloudClientConfig({
        token: 'test-token',
        fetch,
        timeout: 1,
        onError,
      }),
    );

    await expect(client.request('GET', '/applications')).rejects.toBeInstanceOf(LaravelCloudTransportError);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('throws validation errors for 422 JSON failures', async () => {
    const body = {
      message: 'The given data was invalid.',
      errors: { name: ['The name field is required.'] },
    };
    const { fetch } = createFetch(fetchResponse(422, JSON.stringify(body), { 'content-type': 'application/json' }));
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ token: 'test-token', fetch }));

    await expect(client.request('POST', '/applications', { body: { name: '' } })).rejects.toBeInstanceOf(
      LaravelCloudValidationError,
    );
  });

  it('throws HTTP errors with redacted raw bodies for non-JSON failures', async () => {
    const { fetch } = createFetch(fetchResponse(500, '<html>token=lc_secret_token_123 failed</html>', { 'content-type': 'text/html' }));
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ token: 'test-token', fetch }));

    await expect(client.request('GET', '/applications')).rejects.toMatchObject({
      status: 500,
      body: undefined,
      rawBody: '<html>token=[REDACTED] failed</html>',
    } satisfies Partial<LaravelCloudHttpError>);
  });

  it('preserves status and raw body when JSON error responses are malformed', async () => {
    const { fetch } = createFetch(fetchResponse(500, '{"message":', { 'content-type': 'application/json' }));
    const client = new HttpClient(normalizeLaravelCloudClientConfig({ token: 'test-token', fetch }));

    await expect(client.request('GET', '/applications')).rejects.toMatchObject({
      status: 500,
      body: undefined,
      rawBody: '{"message":',
    } satisfies Partial<LaravelCloudHttpError>);
  });
});
