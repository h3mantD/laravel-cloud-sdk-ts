import { normalizeLaravelCloudClientConfig, type LaravelCloudClientOptions, type NormalizedLaravelCloudClientConfig } from './core/config';
import { HttpClient } from './core/http';
import { ApplicationsService } from './services/applications';
import { BucketsService } from './services/buckets';
import { CommandsService } from './services/commands';
import { DeploymentsService } from './services/deployments';
import { EnvironmentsService } from './services/environments';
import { InstancesService } from './services/instances';

export class LaravelCloudClient {
  readonly baseUrl: string;
  readonly applications: ApplicationsService;
  readonly environments: EnvironmentsService;
  readonly deployments: DeploymentsService;
  readonly commands: CommandsService;
  readonly instances: InstancesService;
  readonly buckets: BucketsService;

  readonly #config: NormalizedLaravelCloudClientConfig;

  constructor(options: LaravelCloudClientOptions = {}) {
    this.#config = normalizeLaravelCloudClientConfig(options);
    const http = new HttpClient(this.#config);

    this.baseUrl = this.#config.baseUrl;
    this.applications = new ApplicationsService(http);
    this.environments = new EnvironmentsService(http);
    this.deployments = new DeploymentsService(http);
    this.commands = new CommandsService(http);
    this.instances = new InstancesService(http);
    this.buckets = new BucketsService(http);
  }
}
