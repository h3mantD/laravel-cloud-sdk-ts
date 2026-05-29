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

const instanceEnvelope = {
  data: {
    type: 'instances',
    id: 'inst_123',
    attributes: {
      name: 'Workers',
      type: 'managed_queue',
      size: 'mq-pro-512mb',
      scaling_type: 'custom',
      min_replicas: 1,
      max_replicas: 3,
      queue_status: 'ready',
      paused: false,
      is_default: true,
      visibility_timeout: 90,
      polling_interval: 5,
      shutdown_timeout: 30,
      uses_scheduler: false,
      scaling_cpu_threshold_percentage: 70,
      scaling_memory_threshold_percentage: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  },
};

const failedJobEnvelope = {
  data: {
    type: 'managed_queue_failed_jobs',
    id: 'job_123',
    attributes: {
      name: 'App\\Jobs\\SendEmail',
      queue: 'default',
      failed_at: '2026-01-01T00:00:00Z',
      started_at: '2026-01-01T00:00:01Z',
      attempts: '3',
      exception: 'RuntimeException',
      retried_at: null,
      retry_reserved_until: null,
    },
  },
};

describe('InstancesService', () => {
  it('lists instances for an environment with filters and includes', async () => {
    const envelope = {
      data: [instanceEnvelope.data],
      links: {
        first: 'https://cloud.laravel.com/api/environments/env_123/instances?page=1',
        last: 'https://cloud.laravel.com/api/environments/env_123/instances?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 1,
        links: [],
        path: 'https://cloud.laravel.com/api/environments/env_123/instances',
        per_page: 15,
        to: 1,
        total: 1,
      },
      included: [{ type: 'environments', id: 'env_123' }],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.instances.list('env/123', {
        'filter[name]': 'Workers',
        'filter[type]': 'managed_queue',
        'filter[size]': 'mq-pro-512mb',
        'filter[scaling_type]': 'custom',
        include: ['environment', 'backgroundProcesses'],
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/environments/env%2F123/instances?filter%5Bname%5D=Workers&filter%5Btype%5D=managed_queue&filter%5Bsize%5D=mq-pro-512mb&filter%5Bscaling_type%5D=custom&include=environment,backgroundProcesses',
    );
  });

  it('lists instances without params or a query string', async () => {
    const envelope = { data: [], links: {}, meta: { current_page: 1, from: null, last_page: 1, links: [], path: null, per_page: 15, to: null, total: 0 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.list('env_123')).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/instances');
  });

  it('creates an instance with a JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(201, JSON.stringify(instanceEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);
    const data = {
      name: 'Workers',
      type: 'managed_queue' as const,
      size: 'mq-pro-512mb' as const,
      scaling_type: 'custom' as const,
      min_replicas: 1,
      max_replicas: 3,
      visibility_timeout: 90,
      polling_interval: 5,
      shutdown_timeout: 30,
    };

    await expect(client.instances.create('env/123', data)).resolves.toEqual(instanceEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env%2F123/instances');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(data);
  });

  it('gets an instance by encoded string identifier with includes', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(instanceEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.get('inst/123', { include: ['environment', 'backgroundProcesses'] })).resolves.toEqual(instanceEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst%2F123?include=environment,backgroundProcesses');
  });

  it('gets an instance without params or a query string', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(instanceEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.get('inst_123')).resolves.toEqual(instanceEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst_123');
  });

  it('updates an instance with a partial JSON body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(instanceEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.instances.update('inst_123', {
        name: 'Queue Workers',
        min_replicas: 2,
        max_replicas: 4,
      }),
    ).resolves.toEqual(instanceEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('PATCH');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst_123');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({
      name: 'Queue Workers',
      min_replicas: 2,
      max_replicas: 4,
    });
  });

  it('deletes an instance only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.instances.delete('inst/123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst%2F123');
  });

  it('does not call fetch when instance delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.instances.delete('inst_123', { confirm: false })).rejects.toBeInstanceOf(LaravelCloudConfirmationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('pauses, resumes, and sets a default managed queue without confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(instanceEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.pause('inst/123')).resolves.toEqual(instanceEnvelope);
    await expect(client.instances.resume('inst/123')).resolves.toEqual(instanceEnvelope);
    await expect(client.instances.setDefault('inst/123')).resolves.toEqual(instanceEnvelope);

    expect(requestFrom(captured[0]!).method).toBe('POST');
    expect(requestFrom(captured[0]!).url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/pause');
    expect(requestFrom(captured[1]!).url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/resume');
    expect(requestFrom(captured[2]!).url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/default');
  });

  it('purges a managed queue only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(instanceEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.purge('inst/123', { confirm: true })).resolves.toEqual(instanceEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/purge');
  });

  it('does not call fetch when managed queue purge confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.instances.purge('inst_123', { confirm: false })).rejects.toBeInstanceOf(LaravelCloudConfirmationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists managed queue failed jobs without params or a query string', async () => {
    const envelope = { data: [failedJobEnvelope.data], links: {}, meta: { current_page: 1, from: 1, last_page: 1, links: [], path: null, per_page: 15, to: 1, total: 1 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.listFailedJobs('inst/123')).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/failed-jobs');
  });

  it('accepts omitted failed-job list params without adding a query string', async () => {
    const envelope = { data: [], links: {}, meta: { current_page: 1, from: null, last_page: 1, links: [], path: null, per_page: 15, to: null, total: 0 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.instances.listFailedJobs('inst_123', undefined)).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst_123/failed-jobs');
  });

  it('retries a failed job without confirmation', async () => {
    const response = { message: 'The job is being retried.' };
    const { captured, fetch } = createFetch(fetchResponse(202, JSON.stringify(response), { 'content-type': 'application/json' }));
    const client = createClient(fetch);

    await expect(client.instances.retryFailedJob('inst/123', 'job/123')).resolves.toEqual(response);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/failed-jobs/job%2F123/retry');
  });

  it('deletes a failed job only with confirmation', async () => {
    const { captured, fetch } = createFetch(fetchResponse(204, ''));
    const client = createClient(fetch);

    await expect(client.instances.deleteFailedJob('inst/123', 'job/123', { confirm: true })).resolves.toBeUndefined();

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/inst%2F123/failed-jobs/job%2F123');
  });

  it('does not call fetch when failed-job delete confirmation is missing', async () => {
    const fetch = vi.fn<FetchLike>();
    const client = createClient(fetch);

    await expect(client.instances.deleteFailedJob('inst_123', 'job_123', { confirm: false })).rejects.toBeInstanceOf(
      LaravelCloudConfirmationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists instance sizes as the documented plain JSON shape', async () => {
    const sizes = {
      data: {
        general: [{ name: 'flex-512mb', label: '512 MB', description: 'General purpose', cpu_type: 'shared', compute_class: 'flex', cpu_count: 1, memory_mib: 512 }],
        managed_queue: [{ name: 'mq-pro-512mb', label: '512 MB', description: 'Managed queue', cpu_type: 'shared', compute_class: 'pro', cpu_count: 1, memory_mib: 512 }],
      },
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(sizes), { 'content-type': 'application/json' }));
    const client = createClient(fetch);

    await expect(client.instances.listSizes()).resolves.toEqual(sizes);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/instances/sizes');
  });

  it('does not expose the under-specified managed queue detail endpoint as a stable public method', () => {
    const client = createClient(vi.fn<FetchLike>());

    expect('getFailedJob' in client.instances).toBe(false);
  });
});
