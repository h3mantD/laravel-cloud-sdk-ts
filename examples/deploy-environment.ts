import { LaravelCloudClient } from '../src/index';

function createClient(): LaravelCloudClient {
  const token = process.env.LARAVEL_CLOUD_TOKEN;

  if (token === undefined || token.length === 0) {
    throw new Error('Set LARAVEL_CLOUD_TOKEN before calling this example.');
  }

  return new LaravelCloudClient({ token });
}

export async function createEnvironmentAndDeployment(applicationId: string): Promise<void> {
  const client = createClient();
  const environment = await client.environments.create(applicationId, {
    branch: 'main',
    name: 'Production',
    cluster_id: null,
  });

  const environmentId = environment?.data.id;

  if (environment === undefined || environmentId === undefined) {
    return;
  }

  const deployment = await client.deployments.create(environmentId);

  console.log({
    environment_id: environmentId,
    environment_created_at: environment.data.attributes?.created_at,
    deployment_id: deployment?.data.id,
    deployment_status: deployment?.data.attributes?.status,
  });
}

export async function redeployEnvironment(environmentId: string): Promise<void> {
  const client = createClient();
  const deployment = await client.environments.start(environmentId, { redeploy: true });

  console.log({
    deployment_id: deployment?.data.id,
    deployment_started_at: deployment?.data.attributes?.started_at,
  });
}
