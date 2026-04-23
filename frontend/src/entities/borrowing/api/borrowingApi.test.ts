import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../../../shared/api/client";
import { borrowingApi } from "./borrowingApi";

vi.mock("../../../shared/api/client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn(), delete: vi.fn(), get: vi.fn() },
}));

const mockPatch = vi.mocked(apiClient.patch);

describe("borrowingApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("returnBook", () => {
    it("calls apiClient.patch with the correct path", async () => {
      const borrowing = {
        id: 7,
        user_id: 1,
        book_id: 1,
        book: { id: 1, title: "Clean Code", author: "Robert Martin", genre: "Tech", isbn: "123", total_copies: 3, available_copies: 2 },
        borrowed_at: "2024-01-01T00:00:00Z",
        due_at: "2024-01-15T00:00:00Z",
        returned_at: "2024-01-10T00:00:00Z",
        overdue: false,
      };
      mockPatch.mockResolvedValue(borrowing);

      const result = await borrowingApi.returnBook(7);

      expect(mockPatch).toHaveBeenCalledOnce();
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/borrowings/7/return");
      expect(result).toEqual(borrowing);
    });

    it("passes the correct id in the path", async () => {
      mockPatch.mockResolvedValue({} as any);

      await borrowingApi.returnBook(42);

      expect(mockPatch).toHaveBeenCalledWith("/api/v1/borrowings/42/return");
    });
  });
});
