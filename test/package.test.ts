import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = resolve(rootDir, 'package.json');
const ciWorkflowPath = resolve(rootDir, '.github/workflows/ci.yml');
const esmSmokePath = resolve(rootDir, 'scripts/smoke/esm.mjs');
const cjsSmokePath = resolve(rootDir, 'scripts/smoke/cjs.cjs');

interface PackageMetadata {
  name?: unknown;
  sideEffects?: unknown;
  engines?: {
    node?: unknown;
  };
  exports?: {
    '.'?: {
      types?: unknown;
      import?: unknown;
      require?: unknown;
    };
  };
  files?: unknown;
  scripts?: Record<string, string>;
}

const readPackageMetadata = async (): Promise<PackageMetadata> => {
  const contents = await readFile(packageJsonPath, 'utf8');

  return JSON.parse(contents) as PackageMetadata;
};

describe('package metadata', () => {
  it('declares the published package identity and runtime contract', async () => {
    const packageMetadata = await readPackageMetadata();

    expect(packageMetadata.name).toBe('@h3mantd/laravel-cloud');
    expect(packageMetadata.sideEffects).toBe(false);
    expect(packageMetadata.engines?.node).toBe('>=18');
    expect(packageMetadata.exports?.['.']).toMatchObject({
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    });
  });

  it('keeps the package file allowlist intentional', async () => {
    const packageMetadata = await readPackageMetadata();

    expect(packageMetadata.files).toEqual([
      'dist',
      'docs',
      'openapi/laravel-cloud.openapi.json',
    ]);
    expect(packageMetadata.files).not.toContain('test');
    expect(packageMetadata.files).not.toContain('.sisyphus/evidence');
  });

  it('does not require built dist files for pre-build validation', async () => {
    const packageMetadata = await readPackageMetadata();
    const preBuildScripts = [
      packageMetadata.scripts?.['openapi:types'],
      packageMetadata.scripts?.lint,
      packageMetadata.scripts?.typecheck,
      packageMetadata.scripts?.test,
    ];

    expect(existsSync(packageJsonPath)).toBe(true);
    expect(preBuildScripts).not.toContain(undefined);
    expect(preBuildScripts.join('\n')).not.toContain('dist/');
  });

  it('keeps CI and package scripts free of live credential requirements', async () => {
    const packageMetadata = await readPackageMetadata();
    const workflow = await readFile(ciWorkflowPath, 'utf8');
    const esmSmoke = await readFile(esmSmokePath, 'utf8');
    const cjsSmoke = await readFile(cjsSmokePath, 'utf8');
    const checkedAutomation = [
      Object.values(packageMetadata.scripts ?? {}).join('\n'),
      workflow,
      esmSmoke,
      cjsSmoke,
    ].join('\n');

    expect(checkedAutomation).not.toMatch(/LARAVEL_CLOUD_(TOKEN|API_KEY|SECRET|CREDENTIAL)/u);
    expect(checkedAutomation).not.toMatch(/secrets\./u);
    expect(workflow).not.toContain('openapi:fetch');
  });

  it('runs CI on pushes and pull requests with the required Node matrix and steps', async () => {
    const workflow = await readFile(ciWorkflowPath, 'utf8');
    const requiredCommands = [
      'npm ci',
      'npm run openapi:check',
      'npm run lint',
      'npm run typecheck',
      'npm test',
      'npm run build',
      'npm run test:exports',
      'npm pack --dry-run',
    ];

    expect(workflow).toContain('push:');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('actions/checkout@v4');
    expect(workflow).toContain('actions/setup-node@v4');
    expect(workflow).toContain('cache: npm');
    expect(workflow).toContain('node-version: [18, 22]');

    const commandPositions = requiredCommands.map((command) => workflow.indexOf(command));

    expect(commandPositions.every((position) => position >= 0)).toBe(true);
    expect(commandPositions).toEqual([...commandPositions].sort((left, right) => left - right));
  });
});
