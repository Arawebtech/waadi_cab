export interface Pagination {
  total: number;
  page: number;
  limit?: number;
  pages: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
}
