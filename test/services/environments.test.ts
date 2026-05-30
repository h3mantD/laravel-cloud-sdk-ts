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

const environmentEnvelope = {
  data: {
    type: 'environments',
    id: 'env_123',
    attributes: {
      name: 'Production',
      slug: 'production',
      status: 'running',
      created_from_automation: false,
      vanity_domain: 'production.example.test',
      php_major_version: '8.4',
      build_command: 'npm run build',
      node_version: '22',
      deploy_command: 'php artisan migrate --force',
      uses_octane: true,
      uses_push_to_deploy: true,
      uses_deploy_hook: false,
      environment_variables: [{ key: 'APP_ENV', value: 'production' }],
      network_settings: {
        cache: { strategy: 'standard' },
        response_headers: {
          frame: 'deny',
          content_type: 'nosniff',
          hsts: {
            max_age: 31_536_000,
            include_subdomains: true,
            preload: false,
          },
        },
        firewall: {
          bot_categories: [],
          rate_limit: {
            '429': true,
            level: 'throttle',
            per_minute: 300,
            '4xx': true,
          },
          under_attack_mode_started_at: '',
          block_path: false,
        },
        content_converter: false,
      },
      created_at: '2026-01-01T00:00:00Z',
    },
  },
};

const deploymentEnvelope = {
  data: {
    type: 'deployments',
    id: 'dep_123',
    attributes: {
      status: 'pending',
      branch_name: 'main',
      commit_hash: 'abc123',
      commit_message: 'Deploy production',
      commit_author: 'Taylor',
      failure_reason: null,
      php_major_version: '8.4',
      build_command: 'npm run build',
      node_version: '22',
      uses_octane: true,
      started_at: '2026-01-01T00:00:00Z',
      finished_at: null,
    },
  },
};

describe('EnvironmentsService', () => {
  it('lists environments for an application with filters and includes', async () => {
    const envelope = {
      data: [environmentEnvelope.data],
      links: {
        first: 'https://cloud.laravel.com/api/applications/app_123/environments?page=1',
        last: 'https://cloud.laravel.com/api/applications/app_123/environments?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 1,
        links: [],
        path: 'https://cloud.laravel.com/api/applications/app_123/environments',
        per_page: 15,
        to: 1,
        total: 1,
      },
      included: [{ type: 'applications', id: 'app_123' }],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.environments.list('app_123', {
        'filter[name]': 'Production',
        'filter[status]': 'running',
        'filter[slug]': 'production',
        include: ['application', 'branch', 'currentDeployment'],
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/applications/app_123/environments?filter%5Bname%5D=Production&filter%5Bstatus%5D=running&filter%5Bslug%5D=production&include=application,branch,currentDeployment',
    );
  });

  it('creates an environment with a JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(201, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.environments.create('app_123', {
        branch: 'main',
        name: 'Production',
        cluster_id: null,
      }),
    ).resolves.toEqual(environmentEnvelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/applications/app_123/environments');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({ branch: 'main', name: 'Production', cluster_id: null });
  });

  it('gets an environment by string identifier with includes', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.environments.get('env_123', { include: ['application', 'database'] })).resolves.toEqual(environmentEnvelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123?include=application,database');
  });

  it('updates an environment with a partial JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.environments.update('env_123', {
        name: 'Production',
        uses_push_to_deploy: true,
        build_command: 'npm run build',
      }),
    ).resolves.toEqual(environmentEnvelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('PATCH');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({
      name: 'Production',
      uses_push_to_deploy: true,
      build_command: 'npm run build',
    });
  });

  it('deletes an environment only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.environments.delete('env_123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123');
  });

  it('does not call fetch when environment delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.environments.delete('env_123', { confirm: false })).rejects.toBeInstanceOf(LaravelCloudConfirmationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('starts an environment with optional deployment data and no confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(deploymentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.environments.start('env_123', { redeploy: true })).resolves.toEqual(deploymentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/start');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({ redeploy: true });
  });

  it('starts an environment without a JSON body when data is omitted', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(deploymentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.environments.start('env_123')).resolves.toEqual(deploymentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.headers.get('content-type')).toBeNull();
  });

  it('stops an environment without confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.environments.stop('env_123')).resolves.toEqual(environmentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/stop');
  });

  it('purges edge cache only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.environments.purgeEdgeCache('env_123', { confirm: true })).resolves.toEqual(environmentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/purge-edge-cache');
  });

  it('does not call fetch when edge cache purge confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.environments.purgeEdgeCache('env_123', { confirm: false })).rejects.toBeInstanceOf(
      LaravelCloudConfirmationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('adds environment variables with a JSON body and no confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const variables = {
      method: 'append' as const,
      variables: [{ key: 'APP_ENV', value: 'production' }],
    };

    await expect(client.environments.addVariables('env_123', variables)).resolves.toEqual(environmentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/variables');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(variables);
  });

  it('deletes environment variables by key only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(environmentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.environments.deleteVariables('env_123', ['APP_ENV', 'APP_KEY'], { confirm: true })).resolves.toEqual(
      environmentEnvelope,
    );

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/variables/delete');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({ keys: ['APP_ENV', 'APP_KEY'] });
  });

  it('does not call fetch when environment variable delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.environments.deleteVariables('env_123', ['APP_ENV'], { confirm: false })).rejects.toBeInstanceOf(
      LaravelCloudConfirmationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('gets plain JSON environment metrics without JSON:API conversion', async () => {
    const metrics = {
      data: {
        cpu_usage: { labels: ['avg'], average: [12], data: [{ x: '2026-01-01T00:00:00Z', y: [12] }] },
        memory_usage: { labels: ['avg'], average: [256], data: [{ x: '2026-01-01T00:00:00Z', y: [256] }] },
        http_response_count: { labels: ['2xx'], average: [42], data: [{ x: '2026-01-01T00:00:00Z', y: [42] }] },
        replica_count: { labels: ['web'], average: [2], data: [{ x: '2026-01-01T00:00:00Z', y: [2] }] },
        web_workers_count: { labels: ['workers'], average: [4], data: [{ x: '2026-01-01T00:00:00Z', y: [4] }] },
      },
      meta: { period: '24h', available_periods: ['6h', '24h'] },
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(metrics), { 'content-type': 'application/json' }));
    const client = createClient(fetch);

    await expect(client.environments.getMetrics('env_123', { period: '24h' })).resolves.toEqual(metrics);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/metrics?period=24h');
  });

  it('gets plain JSON environment logs and preserves meta cursor unchanged', async () => {
    const logs = { data: [], meta: { cursor: 'next' } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(logs), { 'content-type': 'application/json' }));
    const client = createClient(fetch);

    await expect(
      client.environments.getLogs('env_123', {
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T01:00:00Z',
        type: 'application',
        cursor: 'next',
        query: 'error',
      }),
    ).resolves.toEqual(logs);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/environments/env_123/logs?from=2026-01-01T00%3A00%3A00Z&to=2026-01-01T01%3A00%3A00Z&type=application&cursor=next&query=error',
    );
  });
});
