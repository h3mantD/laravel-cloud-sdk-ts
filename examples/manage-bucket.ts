import { LaravelCloudClient } from '../src/index';

function createClient(): LaravelCloudClient {
  const token = process.env.LARAVEL_CLOUD_TOKEN;

  if (token === undefined || token.length === 0) {
    throw new Error('Set LARAVEL_CLOUD_TOKEN before calling this example.');
  }

  return new LaravelCloudClient({ token });
}

export async function createBucket(): Promise<void> {
  const client = createClient();
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

  console.log({
    bucket_id: bucket?.data.id,
    bucket_name: bucket?.data.attributes?.name,
    created_at: bucket?.data.attributes?.created_at,
  });
}

export async function listBucketKeys(filesystemId: string): Promise<void> {
  const client = createClient();
  const page = await client.buckets.keys.list(filesystemId, { include: ['filesystem'] });

  for (const key of page?.data ?? []) {
    console.log({
      key_id: key.id,
      name: key.attributes?.name,
      permission: key.attributes?.permission,
      created_at: key.attributes?.created_at,
    });
  }

  console.log({
    next_page: page?.links.next,
    current_page: page?.meta.current_page,
  });
}

export async function createReadOnlyBucketKey(filesystemId: string): Promise<void> {
  const client = createClient();
  const key = await client.buckets.keys.create(filesystemId, {
    name: 'Read only reporting',
    permission: 'read_only',
  });

  console.log({
    key_id: key?.data.id,
    name: key?.data.attributes?.name,
    permission: key?.data.attributes?.permission,
  });
}
