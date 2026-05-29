import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OPENAPI_URL = 'https://cloud.laravel.com/api-docs/api.json';
const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(rootDirectory, 'openapi/laravel-cloud.openapi.json');

const response = await fetch(OPENAPI_URL, {
  headers: {
    accept: 'application/json',
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch Laravel Cloud OpenAPI schema: ${response.status} ${response.statusText}`);
}

const schema = await response.json();
const body = `${JSON.stringify(schema, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, body, 'utf8');

console.log(`Wrote ${outputPath}`);
