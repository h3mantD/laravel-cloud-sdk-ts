import type { components, operations } from '../generated/openapi';

export type Instance = components['schemas']['InstanceResource'];
export type InstanceIncluded = NonNullable<
  operations['public.instances.show']['responses'][200]['content']['application/vnd.api+json']['included']
>[number];
export type ManagedQueueFailedJob = components['schemas']['ManagedQueueFailedJobResource'];
export type InstanceListParams = NonNullable<operations['public.environments.instances.index']['parameters']['query']>;
export type InstanceGetParams = NonNullable<operations['public.instances.show']['parameters']['query']>;
export type ManagedQueueFailedJobListParams = Record<string, never>;
export type CreateInstanceData = components['schemas']['CreateInstanceRequest'];
export type UpdateInstanceData = components['schemas']['UpdateInstanceRequest'];
export type InstanceListResponse = operations['public.environments.instances.index']['responses'][200]['content']['application/vnd.api+json'];
export type InstanceResponse = operations['public.instances.show']['responses'][200]['content']['application/vnd.api+json'];
export type InstanceSizesResponse = operations['public.instances.sizes']['responses'][200]['content']['application/json'];
export type ManagedQueueFailedJobListResponse = operations['public.instances.failed-jobs.index']['responses'][200]['content']['application/vnd.api+json'];
export type RetryManagedQueueFailedJobResponse = operations['public.instances.failed-jobs.retry']['responses'][202]['content']['application/json'];
