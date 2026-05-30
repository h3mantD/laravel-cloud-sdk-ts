import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'laravel-cloud-package-'));
const packDirectory = resolve(temporaryDirectory, 'pack');
const consumerDirectory = resolve(temporaryDirectory, 'consumer');

const esmSmoke = `
  import * as sdk from '@h3mantd/laravel-cloud';

  const client = new sdk.LaravelCloudClient({ token: 'test-token' });

  if (client.baseUrl !== 'https://cloud.laravel.com/api') {
    throw new Error('ESM package import failed to construct LaravelCloudClient');
  }

  if ('HttpClient' in sdk || 'serializeQuery' in sdk || 'decodeResponse' in sdk || 'redactSensitiveText' in sdk) {
    throw new Error('ESM package import exposed internal helpers');
  }
`;

const cjsSmoke = `
  const sdk = require('@h3mantd/laravel-cloud');
  const client = new sdk.LaravelCloudClient({ token: 'test-token' });

  if (client.baseUrl !== 'https://cloud.laravel.com/api') {
    throw new Error('CJS package require failed to construct LaravelCloudClient');
  }

  if ('HttpClient' in sdk || 'serializeQuery' in sdk || 'decodeResponse' in sdk || 'redactSensitiveText' in sdk) {
    throw new Error('CJS package require exposed internal helpers');
  }
`;

const typecheckSource = `
  import { LaravelCloudClient, type FetchLike, type JsonApiResource, type PaginatedEnvelope } from '@h3mantd/laravel-cloud';

  const fetch: FetchLike = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify({ data: [] }),
  });

  const client = new LaravelCloudClient({ token: 'test-token', fetch });
  const page: PaginatedEnvelope<JsonApiResource> = { data: [], links: {}, meta: {} };

  void client;
  void page;
`;

try {
  await mkdir(packDirectory);
  await mkdir(consumerDirectory);
  await run('npm', ['pack', '--ignore-scripts', '--pack-destination', packDirectory], rootDirectory);

  const tarballs = (await readdir(packDirectory)).filter((file) => file.endsWith('.tgz'));

  if (tarballs.length !== 1) {
    throw new Error(`Expected one packed tarball, found ${tarballs.length}`);
  }

  const tarballPath = resolve(packDirectory, tarballs[0]);

  await writeFile(resolve(consumerDirectory, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`, 'utf8');
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], consumerDirectory);
  await run('node', ['--input-type=module', '-e', esmSmoke], consumerDirectory);
  await run('node', ['-e', cjsSmoke], consumerDirectory);
  await writeFile(resolve(consumerDirectory, 'typecheck.ts'), typecheckSource, 'utf8');
  await run(resolve(rootDirectory, 'node_modules/.bin/tsc'), [
    '--module',
    'Node16',
    '--moduleResolution',
    'Node16',
    '--target',
    'ES2022',
    '--strict',
    '--skipLibCheck',
    '--noEmit',
    'typecheck.ts',
  ], consumerDirectory);

  console.log('Packed package install smoke passed');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function run(command, args, cwd) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} exited with code ${code}`));
    });
  });
}
