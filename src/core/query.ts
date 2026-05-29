import type { QueryObject, QueryPrimitive, QueryValue } from './types';

export function serializeQuery(query: QueryObject | undefined): string {
  if (query === undefined) {
    return '';
  }

  const parameters: string[] = [];

  for (const [key, value] of Object.entries(query)) {
    appendQueryValue(parameters, key, value, key === 'include');
  }

  return parameters.join('&');
}

function appendQueryValue(parameters: string[], key: string, value: QueryValue, commaSeparated: boolean): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    appendArrayValue(parameters, key, value, commaSeparated);

    return;
  }

  if (isQueryObject(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendQueryValue(parameters, `${key}[${nestedKey}]`, nestedValue, false);
    }

    return;
  }

  parameters.push(formatParameter(key, String(value)));
}

function appendArrayValue(
  parameters: string[],
  key: string,
  value: readonly QueryPrimitive[],
  commaSeparated: boolean,
): void {
  if (value.length === 0) {
    return;
  }

  if (commaSeparated) {
    parameters.push(`${encodeQueryComponent(key)}=${value.map((item) => encodeQueryComponent(String(item))).join(',')}`);

    return;
  }

  for (const item of value) {
    parameters.push(formatParameter(`${key}[]`, String(item)));
  }
}

function formatParameter(key: string, value: string): string {
  return `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`;
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value).replaceAll('%20', '+');
}

function isQueryObject(value: QueryValue): value is QueryObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
