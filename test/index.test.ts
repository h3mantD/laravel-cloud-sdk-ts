import { describe, expect, it } from 'vitest';

import * as publicSdk from '../src/index';
import { LaravelCloudClient, normalizeLaravelCloudClientConfig } from '../src/index';

describe('public exports', () => {
  it('exports the client and config helpers', () => {
    const client = new LaravelCloudClient({ token: 'test-token' });

    expect(client.baseUrl).toBe('https://cloud.laravel.com/api');
    expect(normalizeLaravelCloudClientConfig({ auth: false }).auth).toBe(false);
  });

  it('does not export internal transport helpers from the package root', () => {
    const exports = publicSdk as Readonly<Record<string, unknown>>;

    expect(exports.HttpClient).toBeUndefined();
    expect(exports.serializeQuery).toBeUndefined();
    expect(exports.decodeResponse).toBeUndefined();
    expect(exports.redactSensitiveText).toBeUndefined();
  });
});
