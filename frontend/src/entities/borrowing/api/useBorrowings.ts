import useSWR from "swr";
import { apiClient } from "../../../shared/api/client";
import type { Borrowing } from "../model/types";

export function useBorrowings() {
  return useSWR<Borrowing[]>("/api/v1/borrowings", () =>
    apiClient.get<Borrowing[]>("/api/v1/borrowings")
  );
}
