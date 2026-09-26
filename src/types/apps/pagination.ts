export type PageMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type Paginated<T> = {
  data: T[]
  meta: PageMeta
}

export type ListQuery = {
  page?: number
  limit?: number
}
