export interface JsonApiResource {
  readonly type: string;
  readonly id?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly relationships?: Readonly<Record<string, unknown>>;
  readonly links?: unknown;
  readonly meta?: unknown;
}

export interface PaginationLinks {
  readonly first?: string | null;
  readonly last?: string | null;
  readonly prev?: string | null;
  readonly next?: string | null;
}

export interface PaginationMeta {
  readonly current_page?: number;
  readonly from?: number | null;
  readonly last_page?: number;
  readonly links?: readonly unknown[];
  readonly path?: string;
  readonly per_page?: number;
  readonly to?: number | null;
  readonly total?: number;
}

export interface SingleEnvelope<TData, TIncluded = JsonApiResource, TMeta = Readonly<Record<string, unknown>>> {
  readonly data: TData;
  readonly included?: readonly TIncluded[];
  readonly meta?: TMeta;
}

export interface CollectionEnvelope<TData, TIncluded = JsonApiResource, TMeta = Readonly<Record<string, unknown>>> {
  readonly data: readonly TData[];
  readonly included?: readonly TIncluded[];
  readonly meta?: TMeta;
}

export interface PaginatedEnvelope<TData, TIncluded = JsonApiResource, TMeta extends PaginationMeta = PaginationMeta>
  extends CollectionEnvelope<TData, TIncluded, TMeta> {
  readonly links: PaginationLinks;
  readonly meta: TMeta;
}
