import { describe, expect, it } from 'vitest';

import { LaravelCloudClient } from '../../src/index';
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

const deploymentEnvelope = {
  data: {
    type: 'deployments',
    id: 'dep_123',
    attributes: {
      status: 'deployment.succeeded',
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
      finished_at: '2026-01-01T00:02:00Z',
    },
  },
};

describe('DeploymentsService', () => {
  it('lists deployments for an environment with filters and includes', async () => {
    const envelope = {
      data: [deploymentEnvelope.data],
      links: {
        first: 'https://cloud.laravel.com/api/environments/env_123/deployments?page=1',
        last: 'https://cloud.laravel.com/api/environments/env_123/deployments?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 1,
        links: [],
        path: 'https://cloud.laravel.com/api/environments/env_123/deployments',
        per_page: 15,
        to: 1,
        total: 1,
      },
      included: [{ type: 'environments', id: 'env_123' }],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.deployments.list('env_123', {
        'filter[status]': 'deployment.succeeded',
        'filter[branch_name]': 'main',
        'filter[commit_hash]': 'abc123',
        include: ['environment', 'initiator'],
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/environments/env_123/deployments?filter%5Bstatus%5D=deployment.succeeded&filter%5Bbranch_name%5D=main&filter%5Bcommit_hash%5D=abc123&include=environment,initiator',
    );
  });

  it('lists deployments without params or a query string', async () => {
    const envelope = { data: [], links: {}, meta: { current_page: 1, from: null, last_page: 1, links: [], path: null, per_page: 15, to: null, total: 0 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.deployments.list('env_123')).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/deployments');
  });

  it('creates a deployment without a JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(deploymentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.deployments.create('env_123')).resolves.toEqual(deploymentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/deployments');
    expect(request.headers.get('content-type')).toBeNull();
  });

  it('gets a deployment by encoded string identifier with includes', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(deploymentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.deployments.get('dep/123', { include: ['environment', 'initiator'] })).resolves.toEqual(deploymentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/deployments/dep%2F123?include=environment,initiator');
  });

  it('gets a deployment without params or a query string', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(deploymentEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.deployments.get('dep_123')).resolves.toEqual(deploymentEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/deployments/dep_123');
  });

  it('gets plain JSON deployment logs without conversion', async () => {
    const logs = {
      data: {
        build: { available: true, steps: [{ step: 'build', status: 'success', description: 'Build app', output: 'ok', duration_ms: 1000 }] },
        deploy: { available: true, steps: [{ step: 'deploy', status: 'success', description: 'Deploy app', time: '2026-01-01T00:01:00Z' }] },
      },
      meta: { deployment_status: 'deployment.succeeded' },
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(logs), { 'content-type': 'application/json' }));
    const client = createClient(fetch);

    await expect(client.deployments.getLogs('dep/123')).resolves.toEqual(logs);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/deployments/dep%2F123/logs');
  });
});
