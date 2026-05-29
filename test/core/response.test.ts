import { describe, expect, it } from 'vitest';

import { decodeResponse, decodeResponseBody } from '../../src/index';

function response(status: number, body: string, headers: HeadersInit = {}): Response {
  return new Response(status === 204 ? null : body, {
    status,
    headers,
  });
}

describe('response decoding', () => {
  it('returns undefined for 204 responses', async () => {
    await expect(decodeResponse(response(204, ''))).resolves.toBeUndefined();
  });

  it('decodes JSON responses by content type', async () => {
    await expect(decodeResponse(response(200, '{"data":{"id":"app_123"}}', { 'content-type': 'application/json' }))).resolves.toEqual({
      data: { id: 'app_123' },
    });
  });

  it('decodes non-empty JSON-like plain responses', async () => {
    await expect(decodeResponse(response(200, '[{"id":"app_123"}]', { 'content-type': 'text/plain' }))).resolves.toEqual([
      { id: 'app_123' },
    ]);
  });

  it('returns undefined for empty non-204 responses', async () => {
    await expect(decodeResponse(response(200, ''))).resolves.toBeUndefined();
  });

  it('retains raw non-JSON response bodies for error construction', async () => {
    await expect(decodeResponseBody(response(500, '<html>server failed</html>', { 'content-type': 'text/html' }))).resolves.toEqual({
      body: undefined,
      rawBody: '<html>server failed</html>',
    });
  });
});
