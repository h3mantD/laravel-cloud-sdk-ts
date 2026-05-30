import { LaravelCloudConfirmationError } from '../core/errors';
import type { HttpClient } from '../core/http';
import type { LaravelCloudConfirmOptions, LaravelCloudUnconfirmedOptions } from '../types/applications';
import type {
  BucketGetParams,
  BucketKeyGetParams,
  BucketKeyListParams,
  BucketKeyListResponse,
  BucketKeyResponse,
  BucketListParams,
  BucketListResponse,
  BucketResponse,
  CreateBucketData,
  CreateBucketKeyData,
  UpdateBucketData,
  UpdateBucketKeyData,
} from '../types/buckets';
import type { ServiceRequestOptions } from './applications';

export class BucketsService {
  readonly keys: BucketKeysService;
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
    this.keys = new BucketKeysService(http);
  }

  list(params?: BucketListParams, options: ServiceRequestOptions = {}): Promise<BucketListResponse | undefined> {
    return this.#http.get<BucketListResponse>('/buckets', {
      ...options,
      query: params,
    });
  }

  create(data: CreateBucketData, options: ServiceRequestOptions = {}): Promise<BucketResponse | undefined> {
    return this.#http.post<BucketResponse>('/buckets', {
      ...options,
      body: data,
    });
  }

  get(filesystem: string, params?: BucketGetParams, options: ServiceRequestOptions = {}): Promise<BucketResponse | undefined> {
    return this.#http.get<BucketResponse>(bucketPath(filesystem), {
      ...options,
      query: params,
    });
  }

  update(filesystem: string, data: UpdateBucketData, options: ServiceRequestOptions = {}): Promise<BucketResponse | undefined> {
    return this.#http.patch<BucketResponse>(bucketPath(filesystem), {
      ...options,
      body: data,
    });
  }

  delete(filesystem: string, confirmation: LaravelCloudConfirmOptions, options?: ServiceRequestOptions): Promise<undefined>;
  delete(filesystem: string, confirmation?: LaravelCloudUnconfirmedOptions, options?: ServiceRequestOptions): Promise<undefined>;
  async delete(
    filesystem: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting an object storage bucket requires { confirm: true }.');

    await this.#http.delete(bucketPath(filesystem), options);
  }
}

export class BucketKeysService {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(filesystem: string, params?: BucketKeyListParams, options: ServiceRequestOptions = {}): Promise<BucketKeyListResponse | undefined> {
    return this.#http.get<BucketKeyListResponse>(bucketKeysPath(filesystem), {
      ...options,
      query: params,
    });
  }

  create(filesystem: string, data: CreateBucketKeyData, options: ServiceRequestOptions = {}): Promise<BucketKeyResponse | undefined> {
    return this.#http.post<BucketKeyResponse>(bucketKeysPath(filesystem), {
      ...options,
      body: data,
    });
  }

  get(filesystemKey: string, params?: BucketKeyGetParams, options: ServiceRequestOptions = {}): Promise<BucketKeyResponse | undefined> {
    return this.#http.get<BucketKeyResponse>(bucketKeyPath(filesystemKey), {
      ...options,
      query: params,
    });
  }

  update(filesystemKey: string, data: UpdateBucketKeyData, options: ServiceRequestOptions = {}): Promise<BucketKeyResponse | undefined> {
    return this.#http.patch<BucketKeyResponse>(bucketKeyPath(filesystemKey), {
      ...options,
      body: data,
    });
  }

  delete(filesystemKey: string, confirmation: LaravelCloudConfirmOptions, options?: ServiceRequestOptions): Promise<undefined>;
  delete(filesystemKey: string, confirmation?: LaravelCloudUnconfirmedOptions, options?: ServiceRequestOptions): Promise<undefined>;
  async delete(
    filesystemKey: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting an object storage bucket key requires { confirm: true }.');

    await this.#http.delete(bucketKeyPath(filesystemKey), options);
  }
}

function bucketPath(filesystem: string): string {
  return `/buckets/${encodeURIComponent(filesystem)}`;
}

function bucketKeysPath(filesystem: string): string {
  return `${bucketPath(filesystem)}/keys`;
}

function bucketKeyPath(filesystemKey: string): string {
  return `/bucket-keys/${encodeURIComponent(filesystemKey)}`;
}

function assertConfirmed(options: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions, message: string): asserts options is LaravelCloudConfirmOptions {
  if (options.confirm !== true) {
    throw new LaravelCloudConfirmationError(message);
  }
}
