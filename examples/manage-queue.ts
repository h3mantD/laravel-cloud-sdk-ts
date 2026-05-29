import { LaravelCloudClient } from '../src/index';

function createClient(): LaravelCloudClient {
  const token = process.env.LARAVEL_CLOUD_TOKEN;

  if (token === undefined || token.length === 0) {
    throw new Error('Set LARAVEL_CLOUD_TOKEN before calling this example.');
  }

  return new LaravelCloudClient({ token });
}

export async function createAndPauseManagedQueue(environmentId: string): Promise<void> {
  const client = createClient();
  const queue = await client.instances.create(environmentId, {
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

  const queueId = queue?.data.id;

  if (queue === undefined || queueId === undefined) {
    return;
  }

  await client.instances.pause(queueId);
  await client.instances.resume(queueId);

  console.log({
    queue_id: queueId,
    queue_status: queue.data.attributes?.queue_status,
    created_at: queue.data.attributes?.created_at,
  });
}

export async function inspectFailedJobs(queueId: string): Promise<void> {
  const client = createClient();
  const page = await client.instances.listFailedJobs(queueId);

  for (const job of page?.data ?? []) {
    console.log({
      job_id: job.id,
      name: job.attributes?.name,
      failed_at: job.attributes?.failed_at,
    });
  }

  console.log({
    next_page: page?.links.next,
    current_page: page?.meta.current_page,
  });
}

export async function purgeManagedQueue(queueId: string): Promise<void> {
  const client = createClient();

  await client.instances.purge(queueId, { confirm: true });
}
