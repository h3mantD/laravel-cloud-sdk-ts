import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(rootDirectory, 'openapi/laravel-cloud.openapi.json');
const outputPath = resolve(rootDirectory, 'src/generated/openapi.ts');
const openapiTypescriptBin = resolve(rootDirectory, 'node_modules/.bin/openapi-typescript');
const allowedMissingDiscriminatorMappings = new Set([
  'components.schemas.DatabaseResource.properties.attributes.properties.config|laravel_mysql_84|#/components/schemas/LaravelMysqlConfig',
  'components.schemas.DatabaseResource.properties.attributes.properties.config|laravel_mysql_8|#/components/schemas/LaravelMysqlConfig',
  'components.schemas.DatabaseResource.properties.attributes.properties.config|aws_rds_mysql_8|#/components/schemas/AwsRdsConfig',
  'components.schemas.DatabaseResource.properties.attributes.properties.config|aws_rds_postgres_18|#/components/schemas/AwsRdsConfig',
  'components.schemas.DatabaseResource.properties.attributes.properties.config|neon_serverless_postgres_18|#/components/schemas/NeonServerlessConfig',
  'components.schemas.DatabaseResource.properties.attributes.properties.config|neon_serverless_postgres_17|#/components/schemas/NeonServerlessConfig',
  'components.schemas.DatabaseResource.properties.attributes.properties.config|neon_serverless_postgres_16|#/components/schemas/NeonServerlessConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|laravel_mysql_84|#/components/schemas/LaravelMysqlConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|laravel_mysql_8|#/components/schemas/LaravelMysqlConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|aws_rds_mysql_8|#/components/schemas/AwsRdsConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|aws_rds_postgres_18|#/components/schemas/AwsRdsConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|neon_serverless_postgres_18|#/components/schemas/NeonServerlessConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|neon_serverless_postgres_17|#/components/schemas/NeonServerlessConfig',
  'components.schemas.StoreDatabaseRequest.properties.config|neon_serverless_postgres_16|#/components/schemas/NeonServerlessConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|laravel_mysql_84|#/components/schemas/LaravelMysqlConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|laravel_mysql_8|#/components/schemas/LaravelMysqlConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|aws_rds_mysql_8|#/components/schemas/AwsRdsConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|aws_rds_postgres_18|#/components/schemas/AwsRdsConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|neon_serverless_postgres_18|#/components/schemas/NeonServerlessConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|neon_serverless_postgres_17|#/components/schemas/NeonServerlessConfig',
  'components.schemas.UpdateDatabaseRequest.properties.config|neon_serverless_postgres_16|#/components/schemas/NeonServerlessConfig',
]);

const schema = JSON.parse(await readFile(inputPath, 'utf8'));
const schemaNames = new Set(Object.keys(schema.components?.schemas ?? {}));

const removedMappings = [];

removeUnresolvableDiscriminatorMappings(schema, schemaNames, [], removedMappings);
assertOnlyAllowedMappingsWereRemoved(removedMappings);

const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'laravel-cloud-openapi-'));
const temporarySchemaPath = resolve(temporaryDirectory, 'laravel-cloud.openapi.json');

try {
  await writeFile(temporarySchemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  await run(openapiTypescriptBin, [temporarySchemaPath, '-o', outputPath]);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function removeUnresolvableDiscriminatorMappings(value, schemaNames, path, removedMappings) {
  if (!value || typeof value !== 'object') {
    return;
  }

  if ('discriminator' in value && typeof value.discriminator === 'object' && value.discriminator?.mapping) {
    const location = path.join('.');

    for (const [key, reference] of Object.entries(value.discriminator.mapping)) {
      if (typeof reference === 'string' && reference.startsWith('#/components/schemas/')) {
        const schemaName = reference.slice('#/components/schemas/'.length);

        if (!schemaNames.has(schemaName)) {
          removedMappings.push({ key, location, reference });
          delete value.discriminator.mapping[key];
        }
      }
    }

    if (Object.keys(value.discriminator.mapping).length === 0) {
      delete value.discriminator.mapping;
    }
  }

  for (const [key, child] of Object.entries(value)) {
    removeUnresolvableDiscriminatorMappings(child, schemaNames, [...path, key], removedMappings);
  }
}

function assertOnlyAllowedMappingsWereRemoved(removedMappings) {
  const removed = new Set(removedMappings.map((mapping) => formatRemovedMapping(mapping)));
  const unexpected = [...removed].filter((mapping) => !allowedMissingDiscriminatorMappings.has(mapping));
  const missing = [...allowedMissingDiscriminatorMappings].filter((mapping) => !removed.has(mapping));

  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error([
      'Laravel Cloud OpenAPI discriminator override list is stale.',
      unexpected.length > 0 ? `Unexpected missing mappings:\n${unexpected.join('\n')}` : '',
      missing.length > 0 ? `Expected missing mappings no longer present:\n${missing.join('\n')}` : '',
    ].filter(Boolean).join('\n\n'));
  }
}

function formatRemovedMapping(mapping) {
  return `${mapping.location}|${mapping.key}|${mapping.reference}`;
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
