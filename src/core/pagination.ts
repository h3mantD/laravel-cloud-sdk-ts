import type { PaginatedEnvelope } from '../types/envelopes';

export type NextPageFetcher<TPage extends PaginatedEnvelope<unknown>> = (nextUrl: string) => TPage | Promise<TPage>;

export async function* paginate<TPage extends PaginatedEnvelope<unknown>>(
  firstPage: TPage,
  fetchNext: NextPageFetcher<TPage>,
): AsyncGenerator<TPage, void, undefined> {
  let page = firstPage;

  while (true) {
    yield page;

    const nextUrl = page.links.next;

    if (nextUrl === undefined || nextUrl === null) {
      return;
    }

    page = await fetchNext(nextUrl);
  }
}
