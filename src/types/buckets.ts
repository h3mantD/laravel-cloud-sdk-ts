import type { components, operations } from '../generated/openapi';

type GeneratedCreateBucketData = components['schemas']['StoreFilesystemRequest'];
type GeneratedUpdateBucketData = components['schemas']['UpdateFilesystemRequest'];

export type Bucket = components['schemas']['FilesystemResource'];
export type BucketKey = components['schemas']['FilesystemKeyResource'];
export type BucketIncluded = NonNullable<operations['public.buckets.show']['responses'][200]['content']['application/vnd.api+json']['included']>[number];
export type BucketKeyIncluded = NonNullable<operations['public.bucket-keys.show']['responses'][200]['content']['application/vnd.api+json']['included']>[number];
export type BucketListParams = NonNullable<operations['public.buckets.index']['parameters']['query']>;
export type BucketGetParams = NonNullable<operations['public.buckets.show']['parameters']['query']>;
export type BucketKeyListParams = NonNullable<operations['public.buckets.keys.index']['parameters']['query']>;
export type BucketKeyGetParams = NonNullable<operations['public.bucket-keys.show']['parameters']['query']>;

export interface CreateBucketData extends Omit<GeneratedCreateBucketData, 'allowed_origins'> {
  /** @deprecated Use `cors_settings.allowed_origins` instead. */
  allowed_origins?: GeneratedCreateBucketData['allowed_origins'];
}

export interface UpdateBucketData extends Omit<GeneratedUpdateBucketData, 'allowed_origins'> {
  /** @deprecated Use `cors_settings.allowed_origins` instead. */
  allowed_origins?: GeneratedUpdateBucketData['allowed_origins'];
}

export type CreateBucketKeyData = components['schemas']['StoreFilesystemKeyRequest'];
export type UpdateBucketKeyData = components['schemas']['UpdateFilesystemKeyRequest'];
export type BucketListResponse = operations['public.buckets.index']['responses'][200]['content']['application/vnd.api+json'];
export type BucketResponse = operations['public.buckets.show']['responses'][200]['content']['application/vnd.api+json'];
export type BucketKeyListResponse = operations['public.buckets.keys.index']['responses'][200]['content']['application/vnd.api+json'];
export type BucketKeyResponse = operations['public.bucket-keys.show']['responses'][200]['content']['application/vnd.api+json'];
