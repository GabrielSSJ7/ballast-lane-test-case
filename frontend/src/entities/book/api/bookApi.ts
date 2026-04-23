import { apiClient } from "../../../shared/api/client";
import type { Book, BookFormData } from "../model/types";

export const bookApi = {
  create: (data: BookFormData) =>
    apiClient.post<Book>("/api/v1/books", { book: data }),

  update: (id: number, data: Partial<BookFormData>) =>
    apiClient.patch<Book>(`/api/v1/books/${id}`, { book: data }),

  delete: (id: number) =>
    apiClient.delete<void>(`/api/v1/books/${id}`),
};
