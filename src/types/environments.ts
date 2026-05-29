import type { components, operations } from '../generated/openapi';

export type Environment = components['schemas']['EnvironmentResource'];
export type EnvironmentDeployment = components['schemas']['DeploymentResource'];
export type EnvironmentIncluded = NonNullable<
  operations['public.environments.show']['responses'][200]['content']['application/vnd.api+json']['included']
>[number];
export type EnvironmentStartIncluded = NonNullable<
  operations['public.environments.start']['responses'][200]['content']['application/vnd.api+json']['included']
>[number];
export type EnvironmentListParams = NonNullable<operations['public.applications.environments.index']['parameters']['query']>;
export type EnvironmentGetParams = NonNullable<operations['public.environments.show']['parameters']['query']>;
export type EnvironmentMetricsParams = NonNullable<operations['public.environments.metrics']['parameters']['query']>;
export type EnvironmentLogsParams = operations['public.environments.logs.index']['parameters']['query'];
export type CreateEnvironmentData = components['schemas']['CreateEnvironmentRequest'];
export type UpdateEnvironmentData = components['schemas']['UpdateEnvironmentRequest'];
export type StartEnvironmentData = components['schemas']['StartEnvironmentRequest'];
export type AddEnvironmentVariablesData = components['schemas']['StoreEnvironmentVariablesRequest'];
export type DeleteEnvironmentVariablesData = components['schemas']['DeleteEnvironmentVariablesRequest'];
export type EnvironmentListResponse = operations['public.applications.environments.index']['responses'][200]['content']['application/vnd.api+json'];
export type EnvironmentResponse = operations['public.environments.show']['responses'][200]['content']['application/vnd.api+json'];
export type EnvironmentStartResponse = operations['public.environments.start']['responses'][200]['content']['application/vnd.api+json'];
export type EnvironmentMetricsResponse = operations['public.environments.metrics']['responses'][200]['content']['application/json'];
export type EnvironmentLogsResponse = operations['public.environments.logs.index']['responses'][200]['content']['application/json'];
