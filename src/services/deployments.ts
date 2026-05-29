import type { HttpClient } from '../core/http';
import type { ServiceRequestOptions } from './applications';
import type {
  DeploymentGetParams,
  DeploymentListParams,
  DeploymentListResponse,
  DeploymentLogsParams,
  DeploymentLogsResponse,
  DeploymentResponse,
} from '../types/deployments';

export class DeploymentsService {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(
    environment: string,
    params?: DeploymentListParams,
    options: ServiceRequestOptions = {},
  ): Promise<DeploymentListResponse | undefined> {
    return this.#http.get<DeploymentListResponse>(environmentDeploymentsPath(environment), {
      ...options,
      query: params,
    });
  }

  create(environment: string, options: ServiceRequestOptions = {}): Promise<DeploymentResponse | undefined> {
    return this.#http.post<DeploymentResponse>(environmentDeploymentsPath(environment), options);
  }

  get(
    deployment: string,
    params?: DeploymentGetParams,
    options: ServiceRequestOptions = {},
  ): Promise<DeploymentResponse | undefined> {
    return this.#http.get<DeploymentResponse>(deploymentPath(deployment), {
      ...options,
      query: params,
    });
  }

  getLogs(
    deployment: string,
    params?: DeploymentLogsParams,
    options: ServiceRequestOptions = {},
  ): Promise<DeploymentLogsResponse | undefined> {
    return this.#http.get<DeploymentLogsResponse>(`${deploymentPath(deployment)}/logs`, {
      ...options,
      query: params,
    });
  }
}

function environmentDeploymentsPath(environment: string): string {
  return `/environments/${encodeURIComponent(environment)}/deployments`;
}

function deploymentPath(deployment: string): string {
  return `/deployments/${encodeURIComponent(deployment)}`;
}
