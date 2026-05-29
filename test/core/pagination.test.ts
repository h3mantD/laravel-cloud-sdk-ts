import { describe, expect, expectTypeOf, it } from 'vitest';

import { paginate } from '../../src/index';
import type { JsonApiResource, PaginatedEnvelope } from '../../src/index';

interface ApplicationResource extends JsonApiResource {
  readonly type: 'applications';
  readonly attributes: {
    readonly name: string;
  };
}

type ApplicationPage = PaginatedEnvelope<ApplicationResource>;

const firstPage: ApplicationPage = {
  data: [
    {
      type: 'applications',
      id: 'app_1',
      attributes: {
        name: 'First application',
      },
    },
  ],
  links: {
    first: '/applications?page=1',
    last: '/applications?page=2',
    prev: null,
    next: '/applications?page=2',
  },
  meta: {
    current_page: 1,
    per_page: 1,
    total: 2,
  },
  included: [
    {
      type: 'organizations',
      id: 'org_1',
    },
  ],
};

const secondPage: ApplicationPage = {
  data: [
    {
      type: 'applications',
      id: 'app_2',
      attributes: {
        name: 'Second application',
      },
    },
  ],
  links: {
    first: '/applications?page=1',
    last: '/applications?page=2',
    prev: '/applications?page=1',
    next: null,
  },
  meta: {
    current_page: 2,
    per_page: 1,
    total: 2,
  },
};

describe('pagination envelopes', () => {
  it('keeps raw JSON:API envelope fields available without adding items', () => {
    expectTypeOf<ApplicationPage>().toHaveProperty('data');
    expectTypeOf<ApplicationPage>().toHaveProperty('links');
    expectTypeOf<ApplicationPage>().toHaveProperty('meta');
    expectTypeOf<ApplicationPage>().toHaveProperty('included');
    expectTypeOf<'items' extends keyof ApplicationPage ? true : false>().toEqualTypeOf<false>();

    expect(firstPage.data[0]?.attributes.name).toBe('First application');
    expect(firstPage.links.next).toBe('/applications?page=2');
    expect(firstPage.meta.current_page).toBe(1);
    expect(firstPage.included?.[0]?.type).toBe('organizations');
    expect('items' in firstPage).toBe(false);
  });

  it('yields raw envelopes and follows relative links.next values until null', async () => {
    const requestedUrls: string[] = [];
    const pages: ApplicationPage[] = [];

    for await (const page of paginate(firstPage, (nextUrl) => {
      requestedUrls.push(nextUrl);

      return Promise.resolve(secondPage);
    })) {
      pages.push(page);
    }

    expect(requestedUrls).toEqual(['/applications?page=2']);
    expect(pages).toEqual([firstPage, secondPage]);
    expect(pages[0]?.data[0]?.id).toBe('app_1');
    expect(pages[0]?.links).toBe(firstPage.links);
    expect(pages[0]?.meta).toBe(firstPage.meta);
    expect(pages[0]?.included).toBe(firstPage.included);
    expect('items' in pages[0]!).toBe(false);
  });

  it('passes absolute links.next values to the next-page fetcher', async () => {
    const absoluteFirstPage: ApplicationPage = {
      ...firstPage,
      links: {
        ...firstPage.links,
        next: 'https://cloud.laravel.com/api/applications?page=2',
      },
    };
    const requestedUrls: string[] = [];

    for await (const page of paginate(absoluteFirstPage, (nextUrl) => {
      requestedUrls.push(nextUrl);

      return secondPage;
    })) {
      expect(page.data).toBeDefined();
    }

    expect(requestedUrls).toEqual(['https://cloud.laravel.com/api/applications?page=2']);
  });
});
