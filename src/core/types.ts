export type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export type QueryPrimitive = string | number | boolean;

export type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | QueryObject | null | undefined;

export interface QueryObject {
  readonly [key: string]: QueryValue;
}

export interface HttpRequestOptions {
  readonly body?: BodyInit | object;
  readonly headers?: HeadersInit;
  readonly query?: QueryObject;
  readonly signal?: AbortSignal;
  readonly timeout?: number;
}

export interface DecodedResponseBody {
  readonly body: unknown;
  readonly parseError?: SyntaxError;
  readonly rawBody: string;
}
