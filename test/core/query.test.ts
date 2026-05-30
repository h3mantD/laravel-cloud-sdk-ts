import { describe, expect, it } from 'vitest';

import { serializeQuery } from '../../src/core/query';

describe('serializeQuery', () => {
  it('serializes bracket filters and comma-separated include arrays', () => {
    const query = serializeQuery({
      filter: {
        name: 'Demo',
        active: true,
      },
      include: ['organization', 'environments'],
      page: 2,
    });

    expect(query).toBe('filter%5Bname%5D=Demo&filter%5Bactive%5D=true&include=organization,environments&page=2');
  });

  it('serializes booleans, numbers, and array values without transforming names', () => {
    const query = serializeQuery({
      enabled: false,
      count: 3,
      region_ids: ['us-east-1', 'eu-west-1'],
    });

    expect(query).toBe('enabled=false&count=3&region_ids%5B%5D=us-east-1&region_ids%5B%5D=eu-west-1');
  });

  it('keeps commas encoded outside include array separators', () => {
    const query = serializeQuery({
      name: 'A,B',
      include: ['organization', 'environments'],
    });

    expect(query).toBe('name=A%2CB&include=organization,environments');
  });

  it('omits undefined, null, and empty array values', () => {
    const query = serializeQuery({
      name: 'Demo',
      missing: undefined,
      empty: null,
      include: [],
    });

    expect(query).toBe('name=Demo');
  });
});
