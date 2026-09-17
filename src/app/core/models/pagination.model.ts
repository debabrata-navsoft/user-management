export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  role?: string | string[];
  status?: string | string[];
  department?: string | string[];
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
