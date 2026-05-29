import { LaravelCloudClient } from '../src/index';

function createClient(): LaravelCloudClient {
  const token = process.env.LARAVEL_CLOUD_TOKEN;

  if (token === undefined || token.length === 0) {
    throw new Error('Set LARAVEL_CLOUD_TOKEN before calling this example.');
  }

  return new LaravelCloudClient({ token });
}

export async function listApplications(): Promise<void> {
  const client = createClient();
  const page = await client.applications.list({
    include: ['organization', 'environments'],
  });

  for (const application of page?.data ?? []) {
    console.log({
      id: application.id,
      name: application.attributes?.name,
      slug: application.attributes?.slug,
      created_at: application.attributes?.created_at,
    });
  }

  console.log({
    next_page: page?.links.next,
    current_page: page?.meta.current_page,
  });
}
