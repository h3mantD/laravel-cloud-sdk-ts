import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(rootDirectory, 'openapi/laravel-cloud.openapi.json');
const outputPath = resolve(rootDirectory, 'src/generated/openapi.ts');
const openapiTypescriptBin = resolve(rootDirectory, 'node_modules/.bin/openapi-typescript');

const schema = JSON.parse(await readFile(inputPath, 'utf8'));
const schemaNames = new Set(Object.keys(schema.components?.schemas ?? {}));

removeUnresolvableDiscriminatorMappings(schema, schemaNames);

const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'laravel-cloud-openapi-'));
const temporarySchemaPath = resolve(temporaryDirectory, 'laravel-cloud.openapi.json');

try {
  await writeFile(temporarySchemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  await run(openapiTypescriptBin, [temporarySchemaPath, '-o', outputPath]);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function removeUnresolvableDiscriminatorMappings(value, schemaNames) {
  if (!value || typeof value !== 'object') {
    return;
  }

  if ('discriminator' in value && typeof value.discriminator === 'object' && value.discriminator?.mapping) {
    for (const [key, reference] of Object.entries(value.discriminator.mapping)) {
      if (typeof reference === 'string' && reference.startsWith('#/components/schemas/')) {
        const schemaName = reference.slice('#/components/schemas/'.length);

        if (!schemaNames.has(schemaName)) {
          delete value.discriminator.mapping[key];
        }
      }
    }

    if (Object.keys(value.discriminator.mapping).length === 0) {
      delete value.discriminator.mapping;
    }
  }

  for (const child of Object.values(value)) {
    removeUnresolvableDiscriminatorMappings(child, schemaNames);
  }
}

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: rootDirectory,
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
