import type { paths } from '../generated/openapi';

export type OpenApiPaths = paths;

export interface ManualOverridePolicy {
  readonly source: 'openapi-snapshot';
  readonly rule: 'Prefer generated OpenAPI types until production usage proves the schema is under-specified.';
  readonly weakSchemas: readonly string[];
}

export const manualOverridePolicy: ManualOverridePolicy = {
  source: 'openapi-snapshot',
  rule: 'Prefer generated OpenAPI types until production usage proves the schema is under-specified.',
  weakSchemas: [
    'The database config discriminator mappings reference schema names that are not present in the upstream document; type generation sanitizes only those broken local mappings and leaves the committed snapshot unchanged.',
    'The queue failed-job detail endpoint appears under-specified and may need a handwritten response override before public SDK exposure.',
    'The /ip endpoint has authentication ambiguity in the upstream OpenAPI document and should be confirmed before client-level auth assumptions are encoded.',
  ],
};
