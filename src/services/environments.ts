import { LaravelCloudConfirmationError } from '../core/errors';
import type { HttpClient } from '../core/http';
import type { ServiceRequestOptions } from './applications';
import type { LaravelCloudConfirmOptions, LaravelCloudUnconfirmedOptions } from '../types/common';
import type {
  AddEnvironmentVariablesData,
  CreateEnvironmentData,
  EnvironmentGetParams,
  EnvironmentListParams,
  EnvironmentListResponse,
  EnvironmentLogsParams,
  EnvironmentLogsResponse,
  EnvironmentMetricsParams,
  EnvironmentMetricsResponse,
  EnvironmentResponse,
  EnvironmentStartResponse,
  StartEnvironmentData,
  UpdateEnvironmentData,
} from '../types/environments';

export class EnvironmentsService {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(
    application: string,
    params?: EnvironmentListParams,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentListResponse | undefined> {
    return this.#http.get<EnvironmentListResponse>(applicationEnvironmentsPath(application), {
      ...options,
      query: params,
    });
  }

  create(
    application: string,
    data: CreateEnvironmentData,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentResponse | undefined> {
    return this.#http.post<EnvironmentResponse>(applicationEnvironmentsPath(application), {
      ...options,
      body: data,
    });
  }

  get(
    environment: string,
    params?: EnvironmentGetParams,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentResponse | undefined> {
    return this.#http.get<EnvironmentResponse>(environmentPath(environment), {
      ...options,
      query: params,
    });
  }

  update(environment: string, data: UpdateEnvironmentData, options: ServiceRequestOptions = {}): Promise<EnvironmentResponse | undefined> {
    return this.#http.patch<EnvironmentResponse>(environmentPath(environment), {
      ...options,
      body: data,
    });
  }

  delete(
    environment: string,
    confirmation: LaravelCloudConfirmOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  delete(
    environment: string,
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  async delete(
    environment: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting an environment requires { confirm: true }.');

    await this.#http.delete(environmentPath(environment), options);
  }

  start(
    environment: string,
    data?: StartEnvironmentData,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentStartResponse | undefined> {
    return this.#http.post<EnvironmentStartResponse>(`${environmentPath(environment)}/start`, {
      ...options,
      body: data,
    });
  }

  stop(environment: string, options: ServiceRequestOptions = {}): Promise<EnvironmentResponse | undefined> {
    return this.#http.post<EnvironmentResponse>(`${environmentPath(environment)}/stop`, options);
  }

  purgeEdgeCache(
    environment: string,
    confirmation: LaravelCloudConfirmOptions,
    options?: ServiceRequestOptions,
  ): Promise<EnvironmentResponse | undefined>;
  purgeEdgeCache(
    environment: string,
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<EnvironmentResponse | undefined>;
  async purgeEdgeCache(
    environment: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentResponse | undefined> {
    assertConfirmed(confirmation, 'Purging an environment edge cache requires { confirm: true }.');

    return await this.#http.post<EnvironmentResponse>(`${environmentPath(environment)}/purge-edge-cache`, options);
  }

  addVariables(
    environment: string,
    variables: AddEnvironmentVariablesData,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentResponse | undefined> {
    return this.#http.post<EnvironmentResponse>(`${environmentPath(environment)}/variables`, {
      ...options,
      body: variables,
    });
  }

  deleteVariables(
    environment: string,
    keys: readonly string[],
    confirmation: LaravelCloudConfirmOptions,
    options?: ServiceRequestOptions,
  ): Promise<EnvironmentResponse | undefined>;
  deleteVariables(
    environment: string,
    keys: readonly string[],
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<EnvironmentResponse | undefined>;
  async deleteVariables(
    environment: string,
    keys: readonly string[],
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentResponse | undefined> {
    assertConfirmed(confirmation, 'Deleting environment variables requires { confirm: true }.');

    return await this.#http.post<EnvironmentResponse>(`${environmentPath(environment)}/variables/delete`, {
      ...options,
      body: { keys: [...keys] },
    });
  }

  getMetrics(
    environment: string,
    params?: EnvironmentMetricsParams,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentMetricsResponse | undefined> {
    return this.#http.get<EnvironmentMetricsResponse>(`${environmentPath(environment)}/metrics`, {
      ...options,
      query: params,
    });
  }

  getLogs(
    environment: string,
    params: EnvironmentLogsParams,
    options: ServiceRequestOptions = {},
  ): Promise<EnvironmentLogsResponse | undefined> {
    return this.#http.get<EnvironmentLogsResponse>(`${environmentPath(environment)}/logs`, {
      ...options,
      query: params,
    });
  }
}

function applicationEnvironmentsPath(application: string): string {
  return `/applications/${encodeURIComponent(application)}/environments`;
}

function environmentPath(environment: string): string {
  return `/environments/${encodeURIComponent(environment)}`;
}

function assertConfirmed(options: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions, message: string): asserts options is LaravelCloudConfirmOptions {
  if (options.confirm !== true) {
    throw new LaravelCloudConfirmationError(message);
  }
}
