import type { FetchLikeResponse } from './config';
import type { DecodedResponseBody } from './types';

export async function decodeResponse<TBody = unknown>(response: FetchLikeResponse): Promise<TBody | undefined> {
  const decoded = await decodeResponseBody(response);

  if (decoded.parseError !== undefined) {
    throw decoded.parseError;
  }

  return decoded.body as TBody | undefined;
}

export async function decodeResponseBody(response: FetchLikeResponse): Promise<DecodedResponseBody> {
  if (response.status === 204) {
    return { body: undefined, rawBody: '' };
  }

  const rawBody = await response.text();

  if (rawBody.length === 0) {
    return { body: undefined, rawBody };
  }

  if (shouldParseJson(response.headers, rawBody)) {
    try {
      return { body: JSON.parse(rawBody) as unknown, rawBody };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { body: undefined, parseError: error, rawBody };
      }

      throw error;
    }
  }

  return { body: undefined, rawBody };
}

function shouldParseJson(headers: Headers, rawBody: string): boolean {
  const contentType = headers.get('content-type')?.toLowerCase() ?? '';

  return contentType.includes('application/json') || contentType.includes('+json') || isJsonLike(rawBody);
}

function isJsonLike(rawBody: string): boolean {
  const trimmed = rawBody.trimStart();

  return trimmed.startsWith('{') || trimmed.startsWith('[');
}
