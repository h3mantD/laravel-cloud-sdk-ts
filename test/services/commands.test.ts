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

const commandEnvelope = {
  data: {
    type: 'commands',
    id: 'cmd_123',
    attributes: {
      command: 'php artisan about',
      output: 'Laravel Cloud',
      status: 'command.success',
      exit_code: 0,
      failure_reason: null,
      started_at: '2026-01-01T00:00:00Z',
      finished_at: '2026-01-01T00:00:02Z',
      created_at: '2026-01-01T00:00:00Z',
    },
  },
};

describe('CommandsService', () => {
  it('lists commands for an environment with filters and includes', async () => {
    const envelope = {
      data: [commandEnvelope.data],
      links: {
        first: 'https://cloud.laravel.com/api/environments/env_123/commands?page=1',
        last: 'https://cloud.laravel.com/api/environments/env_123/commands?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 1,
        links: [],
        path: 'https://cloud.laravel.com/api/environments/env_123/commands',
        per_page: 15,
        to: 1,
        total: 1,
      },
      included: [{ type: 'environments', id: 'env_123' }],
    };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(
      client.commands.list('env_123', {
        'filter[status]': 'command.success',
        'filter[command]': 'php artisan about',
        include: ['environment', 'deployment', 'initiator'],
      }),
    ).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);

    expect(request.method).toBe('GET');
    expect(request.url).toBe(
      'https://cloud.laravel.com/api/environments/env_123/commands?filter%5Bstatus%5D=command.success&filter%5Bcommand%5D=php+artisan+about&include=environment,deployment,initiator',
    );
  });

  it('lists commands without params or a query string', async () => {
    const envelope = { data: [], links: {}, meta: { current_page: 1, from: null, last_page: 1, links: [], path: null, per_page: 15, to: null, total: 0 } };
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(envelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.commands.list('env_123')).resolves.toEqual(envelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env_123/commands');
  });

  it('creates a command with exactly the provided command body', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(commandEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.commands.create('env/123', { command: 'php artisan about' })).resolves.toEqual(commandEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cloud.laravel.com/api/environments/env%2F123/commands');
    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual({ command: 'php artisan about' });
  });

  it('gets a command by encoded string identifier with includes', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(commandEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.commands.get('cmd/123', { include: ['environment', 'deployment', 'initiator'] })).resolves.toEqual(commandEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/commands/cmd%2F123?include=environment,deployment,initiator');
  });

  it('gets a command without params or a query string', async () => {
    const { captured, fetch } = createFetch(fetchResponse(200, JSON.stringify(commandEnvelope), { 'content-type': 'application/vnd.api+json' }));
    const client = createClient(fetch);

    await expect(client.commands.get('cmd_123')).resolves.toEqual(commandEnvelope);

    const request = requestFrom(captured[0]!);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://cloud.laravel.com/api/commands/cmd_123');
  });
});
