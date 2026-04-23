import useSWR from "swr";
import { apiClient } from "../../../shared/api/client";
import type { BooksResponse } from "../model/types";

export function useBooks(query?: string, page = 1) {
  const key = `/api/v1/books?q=${query ?? ""}&page=${page}`;
  return useSWR<BooksResponse>(key, () =>
    apiClient.get<BooksResponse>("/api/v1/books", {
      params: { q: query || undefined, page },
    })
  );
}

export function useBook(id: number) {
  return useSWR<import("../model/types").Book>(
    id ? `/api/v1/books/${id}` : null,
    () => apiClient.get(`/api/v1/books/${id}`)
  );
}
