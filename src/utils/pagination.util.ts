export type PaginationMeta = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export function normalizePagination(page = 1, limit = 20): {
  page: number;
  limit: number;
  skip: number;
} {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function buildPaginationMeta(
  totalRecords: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
  };
}

export function toPaginatedResult<T>(
  items: T[],
  totalRecords: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    pagination: buildPaginationMeta(totalRecords, page, limit),
  };
}
