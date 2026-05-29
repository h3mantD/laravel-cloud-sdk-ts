import { describe, expect, it } from 'vitest';

import { LaravelCloudClient, normalizeLaravelCloudClientConfig } from '../src/index';

describe('public exports', () => {
  it('exports the client and config helpers', () => {
    const client = new LaravelCloudClient({ token: 'test-token' });

    expect(client.baseUrl).toBe('https://cloud.laravel.com/api');
    expect(normalizeLaravelCloudClientConfig({ auth: false }).auth).toBe(false);
  });
});
