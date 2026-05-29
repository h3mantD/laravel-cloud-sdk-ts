import type { components, operations } from '../generated/openapi';

export type Command = components['schemas']['CommandResource'];
export type CommandIncluded = NonNullable<
  operations['public.commands.show']['responses'][200]['content']['application/vnd.api+json']['included']
>[number];
export type CommandListParams = NonNullable<operations['public.environments.commands.index']['parameters']['query']>;
export type CommandGetParams = NonNullable<operations['public.commands.show']['parameters']['query']>;
export type CreateCommandData = components['schemas']['CreateCommandRequest'];
export type CommandListResponse = operations['public.environments.commands.index']['responses'][200]['content']['application/vnd.api+json'];
export type CommandResponse = operations['public.commands.show']['responses'][200]['content']['application/vnd.api+json'];
