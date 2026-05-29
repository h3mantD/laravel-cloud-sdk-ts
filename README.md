# Laravel Cloud SDK

TypeScript SDK for the Laravel Cloud API. It exposes the current stable v1 resources with typed methods, raw API response envelopes, and no hidden live calls in tests or examples.

## Requirements

1. Node 18 or newer.
2. Native `fetch`, `Request`, `Response`, `Headers`, and `FormData` are used. No fetch polyfill is bundled.
3. An organization API token from Laravel Cloud for server side use.

## Installation

```sh
npm install @h3mantd/laravel-cloud
```

## Imports

ESM:

```ts
import { LaravelCloudClient } from '@h3mantd/laravel-cloud';
```

CJS after the package has been built or installed:

```js
const { LaravelCloudClient } = require('@h3mantd/laravel-cloud');
```

Local examples in this repository import from `../src/index` so they typecheck before a package build.

## Authentication

Use a static token when your process can read the token at startup:

```ts
import { LaravelCloudClient } from '@h3mantd/laravel-cloud';

const token = process.env.LARAVEL_CLOUD_TOKEN ?? 'local-placeholder-token';
const client = new LaravelCloudClient({ token });
```

Use an async token provider when the token comes from a vault or short lived credential flow:

```ts
const client = new LaravelCloudClient({
  getToken: async () => process.env.LARAVEL_CLOUD_TOKEN ?? 'local-placeholder-token',
});
```

Do not expose organization tokens in browser apps. Browser and worker compatibility exists for injected `fetch`, service proxies, and trusted server patterns. Public browser storage is not safe for organization credentials.

## Client Configuration

```ts
const client = new LaravelCloudClient({
  token: process.env.LARAVEL_CLOUD_TOKEN ?? 'local-placeholder-token',
  baseUrl: 'https://cloud.laravel.com/api',
  fetch: globalThis.fetch.bind(globalThis),
  timeout: 30_000,
  headers: {
    'X-Request-Source': 'deploy-worker',
  },
  onRequest: ({ request }) => {
    console.log(request.method, request.url);
  },
  onResponse: ({ response }) => {
    console.log(response.status);
  },
  onError: ({ error }) => {
    console.error(error);
  },
});
```

`baseUrl` defaults to the Laravel Cloud API. Custom `fetch` is useful for tests, proxies, workers, and observability wrappers. `timeout`, default headers, and hooks apply to SDK requests.

## Raw Envelopes

The SDK returns API responses as Laravel Cloud sends them. JSON:API style responses keep `data`, `included`, `links`, and `meta`. Field names stay in snake_case, and dates stay as ISO strings. The SDK does not add flattened `items` arrays or convert keys to camelCase.

```ts
const page = await client.applications.list({ include: ['organization'] });

for (const application of page?.data ?? []) {
  console.log(application.id, application.attributes?.name);
}

console.log(page?.links.next);
console.log(page?.meta.current_page);
```

## Pagination

Use `paginate(firstPage, fetchNext)` when an endpoint returns a paginated envelope. The helper yields full page envelopes and passes each raw `links.next` value to your fetcher.

```ts
import { LaravelCloudClient, paginate } from '@h3mantd/laravel-cloud';

const client = new LaravelCloudClient({ token: process.env.LARAVEL_CLOUD_TOKEN ?? 'local-placeholder-token' });
const firstPage = await client.applications.list();

if (firstPage) {
  for await (const page of paginate(firstPage, async (nextUrl) => {
    const response = await fetch(nextUrl, {
      headers: { Authorization: ['Bearer', process.env.LARAVEL_CLOUD_TOKEN ?? 'local-placeholder-token'].join(' ') },
    });

    return await response.json();
  })) {
    for (const application of page.data) {
      console.log(application.id);
    }
  }
}
```

## Errors

All SDK errors extend `LaravelCloudError`. Exported subclasses include `LaravelCloudConfigError`, `LaravelCloudTransportError`, `LaravelCloudConfirmationError`, `LaravelCloudHttpError`, `LaravelCloudAuthenticationError`, `LaravelCloudAuthorizationError`, `LaravelCloudNotFoundError`, and `LaravelCloudValidationError`.

```ts
import { LaravelCloudValidationError } from '@h3mantd/laravel-cloud';

try {
  await client.applications.create({
    source_control_provider_type: 'github',
    repository: 'laravel/demo',
    name: 'Demo',
    region: 'us-east-1',
    cluster_id: null,
  });
} catch (error) {
  if (error instanceof LaravelCloudValidationError) {
    console.error(error.errors);
  }

  throw error;
}
```

Diagnostic strings redact known token and secret patterns. Returned data stays raw, so don't log secrets from response attributes.

## Destructive Operations

Delete and purge methods require an explicit confirmation object. Without it, the SDK throws `LaravelCloudConfirmationError` before making a request.

```ts
await client.buckets.delete('fs_123', { confirm: true });
await client.instances.purge('inst_123', { confirm: true });
await client.environments.deleteVariables('env_123', ['APP_KEY'], { confirm: true });
```

## Service Examples

Applications:

```ts
const applications = await client.applications.list({
  'filter[name]': 'Demo',
  include: ['organization', 'environments'],
});

console.log(applications?.data[0]?.attributes?.slug);
```

Environments:

```ts
const environment = await client.environments.create('app_123', {
  branch: 'main',
  name: 'Production',
  cluster_id: null,
});

console.log(environment?.data.attributes?.created_at);
```

Deployments:

```ts
const deployment = await client.deployments.create('env_123');
const logs = deployment ? await client.deployments.getLogs(deployment.data.id ?? 'dep_123') : undefined;

console.log(logs?.meta.deployment_status);
```

Instances and managed queues:

```ts
const queue = await client.instances.create('env_123', {
  name: 'Workers',
  type: 'managed_queue',
  size: 'mq-pro-512mb',
  scaling_type: 'custom',
  min_replicas: 1,
  max_replicas: 3,
  visibility_timeout: 90,
  polling_interval: 5,
  shutdown_timeout: 30,
});

if (queue?.data.id) {
  await client.instances.pause(queue.data.id);
  await client.instances.resume(queue.data.id);
}
```

Buckets:

```ts
const bucket = await client.buckets.create({
  name: 'Assets',
  visibility: 'public',
  jurisdiction: 'default',
  key_name: 'Deploy key',
  key_permission: 'read_write',
  cors_settings: {
    allowed_origins: ['https://app.example.test'],
    allowed_methods: ['GET', 'HEAD'],
  },
});

console.log(bucket?.data.attributes?.created_at);
```

Longer safe examples live in `examples/`. They export functions only, read `process.env.LARAVEL_CLOUD_TOKEN`, and don't run live calls at module load time.

## Mocked Testing

Pass a custom `fetch` to test SDK usage without credentials or network access. Return API shaped envelopes from the mock, then assert against `page.data`, `links`, and request details.

```ts
import { LaravelCloudClient, type FetchLike } from '@h3mantd/laravel-cloud';

const fetch: FetchLike = async () => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/vnd.api+json' }),
  text: async () => JSON.stringify({
    data: [],
    links: { next: null },
    meta: { current_page: 1, per_page: 15, total: 0 },
  }),
});

const client = new LaravelCloudClient({ token: 'local-placeholder-token', fetch });
const page = await client.applications.list();

console.log(page?.data.length);
```

## API Coverage

See [docs/api-coverage.md](docs/api-coverage.md) for the current v1 support matrix. Runtime services currently cover applications, environments, deployments, commands, instances and managed queues, object storage buckets, and bucket keys. Future resources listed there aren't exposed as client properties until they are implemented and tested.
