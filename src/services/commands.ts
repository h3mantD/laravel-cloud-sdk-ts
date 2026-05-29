import type { HttpClient } from '../core/http';
import type { ServiceRequestOptions } from './applications';
import type {
  CommandGetParams,
  CommandListParams,
  CommandListResponse,
  CommandResponse,
  CreateCommandData,
} from '../types/commands';

export class CommandsService {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(
    environment: string,
    params?: CommandListParams,
    options: ServiceRequestOptions = {},
  ): Promise<CommandListResponse | undefined> {
    return this.#http.get<CommandListResponse>(environmentCommandsPath(environment), {
      ...options,
      query: params,
    });
  }

  create(environment: string, data: CreateCommandData, options: ServiceRequestOptions = {}): Promise<CommandResponse | undefined> {
    return this.#http.post<CommandResponse>(environmentCommandsPath(environment), {
      ...options,
      body: data,
    });
  }

  get(command: string, params?: CommandGetParams, options: ServiceRequestOptions = {}): Promise<CommandResponse | undefined> {
    return this.#http.get<CommandResponse>(commandPath(command), {
      ...options,
      query: params,
    });
  }
}

function environmentCommandsPath(environment: string): string {
  return `/environments/${encodeURIComponent(environment)}/commands`;
}

function commandPath(command: string): string {
  return `/commands/${encodeURIComponent(command)}`;
}
