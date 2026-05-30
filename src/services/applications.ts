import { LaravelCloudConfirmationError } from '../core/errors';
import type { HttpClient } from '../core/http';
import type { HttpRequestOptions } from '../core/types';
import type {
  ApplicationAvatarUpload,
  ApplicationGetParams,
  ApplicationListParams,
  ApplicationListResponse,
  ApplicationResponse,
  CreateApplicationData,
  UpdateApplicationData,
} from '../types/applications';
import type { LaravelCloudConfirmOptions, LaravelCloudUnconfirmedOptions } from '../types/common';

export type ServiceRequestOptions = Omit<HttpRequestOptions, 'body' | 'query'>;

export class ApplicationsService {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(params?: ApplicationListParams, options: ServiceRequestOptions = {}): Promise<ApplicationListResponse | undefined> {
    return this.#http.get<ApplicationListResponse>('/applications', {
      ...options,
      query: params,
    });
  }

  create(data: CreateApplicationData, options: ServiceRequestOptions = {}): Promise<ApplicationResponse | undefined> {
    return this.#http.post<ApplicationResponse>('/applications', {
      ...options,
      body: data,
    });
  }

  get(
    application: string,
    params?: ApplicationGetParams,
    options: ServiceRequestOptions = {},
  ): Promise<ApplicationResponse | undefined> {
    return this.#http.get<ApplicationResponse>(applicationPath(application), {
      ...options,
      query: params,
    });
  }

  update(application: string, data: UpdateApplicationData, options: ServiceRequestOptions = {}): Promise<ApplicationResponse | undefined> {
    return this.#http.patch<ApplicationResponse>(applicationPath(application), {
      ...options,
      body: data,
    });
  }

  delete(
    application: string,
    confirmation: LaravelCloudConfirmOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  delete(
    application: string,
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  async delete(
    application: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting an application requires { confirm: true }.');

    await this.#http.delete(applicationPath(application), options);
  }

  uploadAvatar(
    application: string,
    avatar: ApplicationAvatarUpload,
    options: ServiceRequestOptions = {},
  ): Promise<ApplicationResponse | undefined> {
    return this.#http.post<ApplicationResponse>(`${applicationPath(application)}/avatar`, {
      ...options,
      body: toAvatarFormData(avatar),
    });
  }

  deleteAvatar(
    application: string,
    confirmation: LaravelCloudConfirmOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  deleteAvatar(
    application: string,
    confirmation?: LaravelCloudUnconfirmedOptions,
    options?: ServiceRequestOptions,
  ): Promise<undefined>;
  async deleteAvatar(
    application: string,
    confirmation: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions = {},
    options: ServiceRequestOptions = {},
  ): Promise<undefined> {
    assertConfirmed(confirmation, 'Deleting an application avatar requires { confirm: true }.');

    await this.#http.delete(`${applicationPath(application)}/avatar`, options);
  }
}

function applicationPath(application: string): string {
  return `/applications/${encodeURIComponent(application)}`;
}

function toAvatarFormData(avatar: ApplicationAvatarUpload): FormData {
  if (avatar instanceof FormData) {
    return avatar;
  }

  const formData = new FormData();
  formData.append('avatar', avatar);

  return formData;
}

function assertConfirmed(options: LaravelCloudConfirmOptions | LaravelCloudUnconfirmedOptions, message: string): asserts options is LaravelCloudConfirmOptions {
  if (options.confirm !== true) {
    throw new LaravelCloudConfirmationError(message);
  }
}
