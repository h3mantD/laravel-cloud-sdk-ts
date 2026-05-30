import { describe, expect, it, vi } from 'vitest';

import { LaravelCloudClient, LaravelCloudConfirmationError } from '../../src/index';
import { redactSensitiveText } from '../../src/core/redact';
import type { FetchLike, FetchLikeResponse } from '../../src/index';

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

function createClient(fetch: FetchLike): LaravelCloudClient {
  return new LaravelCloudClient({
    token: 'test-token',
    baseUrl: 'https://cloud.laravel.com/api',
    fetch,
  });
}

const bucketEnvelope = {
  data: {
    type: 'filesystems',
    id: 'fs_123',
    attributes: {
      name: 'Assets',
      type: 'cloudflare_r2',
      status: 'available',
      visibility: 'public',
      jurisdiction: 'default',
      endpoint: 'https://assets.example.test',
      url: 'https://assets.example.test/assets',
      allowed_origins: 'https://legacy.example.test',
      cors_settings: '{"allowed_origins":["https://app.example.test"]}',
      created_at: '2026-01-01T00:00:00Z',
    },
  },
};

const keyEnvelope = {
  data: {
    type: 'filesystemKeys',
    id: 'fsk_123',
    attributes: {
      name: 'Deploy key',
      permission: 'read_write',
      access_key_id: 'AKIA_TEST',
      access_key_secret: 'bucket-secret-value',
      created_at: '2026-01-01T00:00:00Z',
    },
  },
};

describe('BucketsService', () => {
  it('lists buckets with filters and comma-separated includes', async () => {
    const envelope = {
      data: [bucketEnvelope.data],
      links: {
        first: 'https://cloud.laravel.com/api/buckets?page=1',
        last: 'https://cloud.laravel.com/api/buckets?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 1,
        links: [],
        path: 'https://cloud.laravel.com/api/buckets',
        per_page: 15,
        to: 1,
        total: 1,
      },
      included: [keyEnvelope.data],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.buckets.list({
        'filter[type]': 'cloudflare_r2',
        'filter[status]': 'available',
        'filter[visibility]': 'public',
        include: ['keys'],
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/buckets?filter%5Btype%5D=cloudflare_r2&filter%5Bstatus%5D=available&filter%5Bvisibility%5D=public&include=keys',
    );
  });

  it('lists buckets without params or a query string', async () => {
    const envelope = { data: [], links: {}, meta: { current_page: 1, from: null, last_page: 1, links: [], path: null, per_page: 15, to: null, total: 0 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.buckets.list()).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets');
  });

  it('creates a bucket with a JSON body using cors_settings allowed origins', async () => {
    const { captured, fetch } = createFetch(fetchResponse(201, JSON.stringify(bucketEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const data = {
      name: 'Assets',
      visibility: 'public' as const,
      jurisdiction: 'default' as const,
      key_name: 'Deploy key',
      key_permission: 'read_write' as const,
      cors_settings: {
        allowed_origins: ['https://app.example.test'],
        allowed_methods: ['GET' as const, 'HEAD' as const],
      },
    };

    await expect(client.buckets.create(data)).resolves.toEqual(bucketEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(data);
  });

  it('gets a bucket by encoded filesystem identifier with includes', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(bucketEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.buckets.get('fs/123', { include: ['keys'] })).resolves.toEqual(bucketEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs%2F123?include=keys');
  });

  it('gets a bucket without params or a query string', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(bucketEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.buckets.get('fs_123')).resolves.toEqual(bucketEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs_123');
  });

  it('updates a bucket with a partial JSON body using cors_settings allowed origins', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(bucketEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const data = {
      name: 'Public Assets',
      visibility: 'public' as const,
      cors_settings: {
        allowed_origins: ['https://app.example.test'],
      },
    };

    await expect(client.buckets.update('fs_123', data)).resolves.toEqual(bucketEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('PATCH');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs_123');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(data);
  });

  it('deletes a bucket only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.buckets.delete('fs/123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs%2F123');
  });

  it('does not call fetch when bucket delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.buckets.delete('fs_123', { confirm: false })).rejects.toBeInstanceOf(LaravelCloudConfirmationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists bucket keys with includes', async () => {
    const envelope = {
      data: [keyEnvelope.data],
      links: {},
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: null, per_page: 15, to: 1, total: 1 },
      included: [bucketEnvelope.data],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.buckets.keys.list('fs/123', { include: ['filesystem'] })).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs%2F123/keys?include=filesystem');
  });

  it('lists bucket keys without params or a query string', async () => {
    const envelope = { data: [], links: {}, meta: { current_page: 1, from: null, last_page: 1, links: [], path: null, per_page: 15, to: null, total: 0 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.buckets.keys.list('fs_123')).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs_123/keys');
  });

  it('creates a bucket key with a JSON body and preserves returned access key secret', async () => {
    const { captured, fetch } = createFetch(fetchResponse(201, JSON.stringify(keyEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const data = { name: 'Deploy key', permission: 'read_write' as const };

    await expect(client.buckets.keys.create('fs/123', data)).resolves.toEqual(keyEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/buckets/fs%2F123/keys');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(data);
  });

  it('gets a bucket key by encoded filesystem key identifier', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(keyEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.buckets.keys.get('fsk/123', { include: ['filesystem'] })).resolves.toEqual(keyEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/bucket-keys/fsk%2F123?include=filesystem');
  });

  it('updates a bucket key with a JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(keyEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const data = { name: 'Rotated deploy key' };

    await expect(client.buckets.keys.update('fsk_123', data)).resolves.toEqual(keyEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('PATCH');
    expect(request.url).toBe('https://cloud.laravel.com/api/bucket-keys/fsk_123');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(data);
  });

  it('deletes a bucket key only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.buckets.keys.delete('fsk/123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/bucket-keys/fsk%2F123');
  });

  it('does not call fetch when bucket key delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.buckets.keys.delete('fsk_123', { confirm: false })).rejects.toBeInstanceOf(LaravelCloudConfirmationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redacts bucket key secrets from diagnostics without mutating returned data', () => {
    expect(keyEnvelope.data.attributes.access_key_secret).toBe('bucket-secret-value');

    const diagnostic = redactSensitiveText(JSON.stringify(keyEnvelope));

    expect(diagnostic).not.toContain('bucket-secret-value');
    expect(diagnostic).toContain('"access_key_secret":"[REDACTED]"');
    expect(keyEnvelope.data.attributes.access_key_secret).toBe('bucket-secret-value');
  });
});
