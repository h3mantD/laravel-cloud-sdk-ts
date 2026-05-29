import { describe, expect, it } from 'vitest';

import { LaravelCloudClient, LaravelCloudConfigError, normalizeLaravelCloudClientConfig } from '../src/index';

describe('LaravelCloudClient', () => {
  it('accepts a static token and exposes implemented services', () => {
    const client = new LaravelCloudClient({ token: 'test-token' });

    expect(client.baseUrl).toBe('https://cloud.laravel.com/api');
    expect(client.applications).toMatchObject({});
    expect(typeof client.applications.list).toBe('function');
    expect(client.environments).toMatchObject({});
    expect(typeof client.environments.list).toBe('function');
    expect(client.deployments).toMatchObject({});
    expect(typeof client.deployments.list).toBe('function');
    expect(client.commands).toMatchObject({});
    expect(typeof client.commands.list).toBe('function');
    expect(client.instances).toMatchObject({});
    expect(typeof client.instances.list).toBe('function');
    expect(client.buckets).toMatchObject({});
    expect(typeof client.buckets.list).toBe('function');
    expect(typeof client.buckets.keys.list).toBe('function');
  });

  it('accepts an async token provider through the public config contract', async () => {
    const config = normalizeLaravelCloudClientConfig({
      getToken: () => Promise.resolve('async-token'),
    });

    expect(config.auth).not.toBe(false);
    if (config.auth === false) {
      throw new Error('Expected authenticated config');
    }

    await expect(config.auth.getToken()).resolves.toBe('async-token');
  });

  it('allows explicit unauthenticated clients', () => {
    const client = new LaravelCloudClient({ auth: false });

    expect(client.baseUrl).toBe('https://cloud.laravel.com/api');
  });

  it('throws a config error when auth is missing', () => {
    expect(() => new LaravelCloudClient({})).toThrow(LaravelCloudConfigError);
    expect(() => new LaravelCloudClient({})).toThrow('Laravel Cloud authentication requires a token or getToken provider');
  });

  it('uses the configured base URL', () => {
    const client = new LaravelCloudClient({
      token: 'test-token',
      baseUrl: 'https://example.test/api',
    });

    expect(client.baseUrl).toBe('https://example.test/api');
  });

  it('normalizes custom fetch, timeout, and headers options', () => {
    const customFetch = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve('{}'),
      });
    const headers = { 'x-test-header': 'test-value' };

    const config = normalizeLaravelCloudClientConfig({
      token: 'test-token',
      fetch: customFetch,
      timeout: 1_000,
      headers,
    });

    expect(config.fetch).toBe(customFetch);
    expect(config.timeout).toBe(1_000);
    expect(config.headers).toBe(headers);
  });

  it('defaults fetch to the global fetch implementation when available', () => {
    const config = normalizeLaravelCloudClientConfig({ token: 'test-token' });

    expect(config.fetch).toBeDefined();
    expect(config.fetch).not.toBe(globalThis.fetch);
  });

  it('does not expose future service namespaces at runtime', () => {
    const client = new LaravelCloudClient({ token: 'test-token' });

    expect(Object.prototype.hasOwnProperty.call(client, 'databases')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(client, 'caches')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(client, 'domains')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(client, 'websockets')).toBe(false);
  });
});
