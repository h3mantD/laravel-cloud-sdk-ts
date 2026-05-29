import { LaravelCloudConfirmationError } from '../core/errors';
import type { HttpClient } from '../core/http';
import type { LaravelCloudConfirmOptions, LaravelCloudUnconfirmedOptions } from '../types/applications';
import type {
  CreateInstanceData,
  InstanceGetParams,
  InstanceListParams,
  InstanceListResponse,
  InstanceResponse,
  InstanceSizesResponse,
  ManagedQueueFailedJobListParams,
  ManagedQueueFailedJobListResponse,
  RetryManagedQueueFailedJobResponse,
  UpdateInstanceData,
} from '../types/instances';
import type { ServiceRequestOptions } from './applications';

export class InstancesService {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(environment: string, params?: InstanceListParams, options: ServiceRequestOptions = {}): Promise<InstanceListResponse | undefined> {
    return this.#http.get<InstanceListResponse>(environmentInstancesPath(environment), {
      ...options,
      query: params,
    });
  }

  create(environment: string, data: CreateInstanceData, options: ServiceRequestOptions = {}): Promise<InstanceResponse | undefined> {
    return this.#http.post<InstanceResponse>(environmentInstancesPath(environment), {
      ...options,
      body: data as unknown as BodyInit,
    });
  }

  get(instance: string, params?: InstanceGetParams, options: ServiceRequestOptions = {}): Promise<InstanceResponse | undefined> {
    return this.#http.get<InstanceResponse>(instancePath(instance), {
      ...options,
      query: params,
    });
  }

  update(instance: string, data: UpdateInstanceData, options: ServiceRequestOptions = {}): Promise<InstanceResponse | undefined> {
    return this.#http.patch<InstanceResponse>(instancePath(instance), {
      ...options,
      body: data as unknown as BodyInit,
    });
  }

  delete(instance: string, confirmation: LaravelCloudConfirmOptions, options?: ServiceRequestOptions): Promise<undefined>;
  delete(instance: string, confirmation?: LaravelCloudUnconfirmedOptions, options?: ServiceRequestOptions): Promise<undefined>;
  async delete(
    instance: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting an instance requires { confirm: true }.');

    await this.#http.delete(instancePath(instance), options);
  }

  pause(instance: string, options: ServiceRequestOptions = {}): Promise<InstanceResponse | undefined> {
    return this.#http.post<InstanceResponse>(`${instancePath(instance)}/pause`, options);
  }

  resume(instance: string, options: ServiceRequestOptions = {}): Promise<InstanceResponse | undefined> {
    return this.#http.post<InstanceResponse>(`${instancePath(instance)}/resume`, options);
  }

  setDefault(instance: string, options: ServiceRequestOptions = {}): Promise<InstanceResponse | undefined> {
    return this.#http.post<InstanceResponse>(`${instancePath(instance)}/default`, options);
  }

  purge(instance: string, confirmation: LaravelCloudConfirmOptions, options?: ServiceRequestOptions): Promise<InstanceResponse | undefined>;
  purge(
    instance: string,
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<InstanceResponse | undefined>;
  async purge(
    instance: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<InstanceResponse | undefined> {
    assertConfirmed(confirmation, 'Purging a managed queue requires { confirm: true }.');

    return await this.#http.post<InstanceResponse>(`${instancePath(instance)}/purge`, options);
  }

  listFailedJobs(
    instance: string,
    params?: ManagedQueueFailedJobListParams,
    options: ServiceRequestOptions = {},
  ): Promise<ManagedQueueFailedJobListResponse | undefined> {
    return this.#http.get<ManagedQueueFailedJobListResponse>(`${instancePath(instance)}/failed-jobs`, {
      ...options,
      query: params,
    });
  }

  retryFailedJob(
    instance: string,
    jobId: string,
    options: ServiceRequestOptions = {},
  ): Promise<RetryManagedQueueFailedJobResponse | undefined> {
    return this.#http.post<RetryManagedQueueFailedJobResponse>(`${instancePath(instance)}/failed-jobs/${encodeURIComponent(jobId)}/retry`, options);
  }

  deleteFailedJob(
    instance: string,
    jobId: string,
    confirmation: LaravelCloudConfirmOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  deleteFailedJob(
    instance: string,
    jobId: string,
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  async deleteFailedJob(
    instance: string,
    jobId: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting a managed queue failed job requires { confirm: true }.');

    await this.#http.delete(`${instancePath(instance)}/failed-jobs/${encodeURIComponent(jobId)}`, options);
  }

  listSizes(options: ServiceRequestOptions = {}): Promise<InstanceSizesResponse | undefined> {
    return this.#http.get<InstanceSizesResponse>('/instances/sizes', options);
  }
}

function environmentInstancesPath(environment: string): string {
  return `/environments/${encodeURIComponent(environment)}/instances`;
}

function instancePath(instance: string): string {
  return `/instances/${encodeURIComponent(instance)}`;
}

function assertConfirmed(options: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions, message: string): asserts options is LaravelCloudConfirmOptions {
  if (options.confirm !== true) {
    throw new LaravelCloudConfirmationError(message);
  }
}
