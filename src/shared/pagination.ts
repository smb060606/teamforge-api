import { z } from 'zod';
import { PaginationParams, PaginatedResponse } from './types';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const parsed = paginationSchema.parse(query);
  return {
    page: parsed.page,
    limit: parsed.limit,
    sortBy: parsed.sortBy,
    sortOrder: parsed.sortOrder,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export function getPrismaSkipTake(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}
