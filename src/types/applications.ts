import type { components, operations } from '../generated/openapi';

export type Application = components['schemas']['ApplicationResource'];
export type ApplicationIncluded = NonNullable<
  operations['public.applications.show']['responses'][200]['content']['application/vnd.api+json']['included']
>[number];
export type ApplicationListParams = NonNullable<operations['public.applications.index']['parameters']['query']>;
export type ApplicationGetParams = NonNullable<operations['public.applications.show']['parameters']['query']>;
export type CreateApplicationData = components['schemas']['CreateApplicationRequest'];
export type UpdateApplicationData = components['schemas']['UpdateApplicationRequest'];
export type ApplicationListResponse = operations['public.applications.index']['responses'][200]['content']['application/vnd.api+json'];
export type ApplicationResponse = operations['public.applications.show']['responses'][200]['content']['application/vnd.api+json'];

export type ApplicationAvatarUpload = Blob | File | FormData;
