const { LaravelCloudClient } = require('../../dist/index.cjs');

const client = new LaravelCloudClient({ token: 'test-token' });

if (client.baseUrl !== 'https://cloud.laravel.com/api') {
  throw new Error('CJS export smoke failed to construct LaravelCloudClient');
}

console.log('CJS export smoke passed');
