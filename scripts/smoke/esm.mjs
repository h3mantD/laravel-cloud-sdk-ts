import { LaravelCloudClient } from '../../dist/index.js';

const client = new LaravelCloudClient({ token: 'test-token' });

if (client.baseUrl !== 'https://cloud.laravel.com/api') {
  throw new Error('ESM export smoke failed to construct LaravelCloudClient');
}

console.log('ESM export smoke passed');
