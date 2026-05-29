import type { components, operations } from '../generated/openapi';

export type Deployment = components['schemas']['DeploymentResource'];
export type DeploymentIncluded = NonNullable<
  operations['public.deployments.show']['responses'][200]['content']['application/vnd.api+json']['included']
>[number];
export type DeploymentListParams = NonNullable<operations['public.environments.deployments.index']['parameters']['query']>;
export type DeploymentGetParams = NonNullable<operations['public.deployments.show']['parameters']['query']>;
export type DeploymentLogsParams = NonNullable<operations['public.deployments.logs']['parameters']['query']>;
export type DeploymentListResponse = operations['public.environments.deployments.index']['responses'][200]['content']['application/vnd.api+json'];
export type DeploymentResponse = operations['public.deployments.show']['responses'][200]['content']['application/vnd.api+json'];
export type DeploymentLogsResponse = operations['public.deployments.logs']['responses'][200]['content']['application/json'];
