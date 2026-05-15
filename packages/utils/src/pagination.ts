import type { PaginationMeta } from '@shaj/types';

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getPaginationSkipTake(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

export function normalizePage(page?: number | string): number {
  const p = Number(page);
  return isNaN(p) || p < 1 ? 1 : p;
}

export function normalizeLimit(limit?: number | string, max = 100): number {
  const l = Number(limit);
  if (isNaN(l) || l < 1) return 20;
  return Math.min(l, max);
}
