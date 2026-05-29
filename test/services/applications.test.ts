import { describe, expect, it, vi } from 'vitest';

import { LaravelCloudClient, LaravelCloudConfirmationError } from '../../src/index';
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

const applicationEnvelope = {
  data: {
    type: 'applications',
    id: 'app_123',
    attributes: {
      name: 'Demo',
      slug: 'demo',
      region: 'us-east-1',
      slack_channel: null,
      avatar_url: 'https://example.test/avatar.png',
      created_at: '2026-01-01T00:00:00Z',
      repository: {
        full_name: 'laravel/demo',
        default_branch: 'main',
      },
    },
  },
};

describe('ApplicationsService', () => {
  it('lists applications with filters and comma-separated includes', async () => {
    const envelope = {
      data: [applicationEnvelope.data],
      links: {
        first: 'https://cloud.laravel.com/api/applications?page=1',
        last: 'https://cloud.laravel.com/api/applications?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 1,
        links: [],
        path: 'https://cloud.laravel.com/api/applications',
        per_page: 15,
        to: 1,
        total: 1,
      },
      included: [{ type: 'organizations', id: 'org_123' }],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.applications.list({
        'filter[name]': 'Demo',
        'filter[region]': 'us-east-1',
        'filter[slug]': 'demo',
        include: ['organization', 'environments', 'defaultEnvironment'],
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/applications?filter%5Bname%5D=Demo&filter%5Bregion%5D=us-east-1&filter%5Bslug%5D=demo&include=organization,environments,defaultEnvironment',
    );
  });

  it('creates an application with a JSON body and returns the raw single envelope', async () => {
    const { captured, fetch } = createFetch(fetchResponse(201, JSON.stringify(applicationEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.applications.create({
        source_control_provider_type: 'github',
        repository: 'laravel/demo',
        name: 'Demo',
        region: 'us-east-1',
        cluster_id: null,
      }),
    ).resolves.toEqual(applicationEnvelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({
      source_control_provider_type: 'github',
      repository: 'laravel/demo',
      name: 'Demo',
      region: 'us-east-1',
      cluster_id: null,
    });
  });

  it('gets an application by string identifier with includes', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(applicationEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.applications.get('app_123', { include: ['organization'] })).resolves.toEqual(applicationEnvelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications/app_123?include=organization');
  });

  it('updates an application with a partial JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(applicationEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.applications.update('app_123', {
        name: 'Renamed Demo',
        slug: 'renamed-demo',
        slack_channel: '#deployments',
      }),
    ).resolves.toEqual(applicationEnvelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('PATCH');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications/app_123');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({
      name: 'Renamed Demo',
      slug: 'renamed-demo',
      slack_channel: '#deployments',
    });
  });

  it('deletes an application only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.applications.delete('app_123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications/app_123');
  });

  it('does not call fetch when application delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.applications.delete('app_123', { confirm: false })).rejects.toBeInstanceOf(LaravelCloudConfirmationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uploads an application avatar as FormData without a JSON content type', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(applicationEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const avatar = new Blob(['avatar'], { type: 'image/png' });

    await expect(client.applications.uploadAvatar('app_123', avatar)).resolves.toEqual(applicationEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications/app_123/avatar');
    expect(request.headers.get('content-type')).not.toBe('application/json');

    const formData = await request.formData();
    expect(formData.get('avatar')).toBeInstanceOf(Blob);
  });

  it('accepts caller-provided FormData for application avatar upload', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(applicationEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const avatar = new FormData();

    avatar.append('avatar', new Blob(['avatar'], { type: 'image/png' }), 'avatar.png');

    await expect(client.applications.uploadAvatar('app_123', avatar)).resolves.toEqual(applicationEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.headers.get('content-type')).not.toBe('application/json');

    const formData = await request.formData();
    expect(formData.get('avatar')).toBeInstanceOf(Blob);
  });

  it('deletes an application avatar only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.applications.deleteAvatar('app_123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications/app_123/avatar');
  });

  it('does not call fetch when application avatar delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.applications.deleteAvatar('app_123', { confirm: false })).rejects.toBeInstanceOf(
      LaravelCloudConfirmationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
