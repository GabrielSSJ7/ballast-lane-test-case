import useSWR from "swr";
import { apiClient } from "../../../shared/api/client";
import type { LibrarianDashboard, MemberDashboard } from "../model/types";

export function useLibrarianDashboard() {
  return useSWR<LibrarianDashboard>("/api/v1/dashboard/librarian", () =>
    apiClient.get<LibrarianDashboard>("/api/v1/dashboard/librarian")
  );
}

export function useMemberDashboard() {
  return useSWR<MemberDashboard>("/api/v1/dashboard/member", () =>
    apiClient.get<MemberDashboard>("/api/v1/dashboard/member")
  );
}
