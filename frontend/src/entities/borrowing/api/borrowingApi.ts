import { apiClient } from "../../../shared/api/client";
import type { Borrowing } from "../model/types";

export const borrowingApi = {
  returnBook: (id: number) =>
    apiClient.patch<Borrowing>(`/api/v1/borrowings/${id}/return`),
};
