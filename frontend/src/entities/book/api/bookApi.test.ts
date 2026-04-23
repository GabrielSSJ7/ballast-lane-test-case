import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../../../shared/api/client";
import { bookApi } from "./bookApi";

vi.mock("../../../shared/api/client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn(), delete: vi.fn(), get: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);

const bookFormData = {
  title: "Clean Code",
  author: "Robert Martin",
  genre: "Tech",
  isbn: "978-0",
  total_copies: 3,
};

describe("bookApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("calls apiClient.post with the correct path and wrapped body", async () => {
      const created = { id: 1, ...bookFormData, available_copies: 3 };
      mockPost.mockResolvedValue(created);

      const result = await bookApi.create(bookFormData);

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith("/api/v1/books", { book: bookFormData });
      expect(result).toEqual(created);
    });
  });

  describe("update", () => {
    it("calls apiClient.patch with the correct path and wrapped body", async () => {
      const updated = { id: 1, ...bookFormData, available_copies: 3 };
      mockPatch.mockResolvedValue(updated);

      const partial = { title: "Refactoring" };
      const result = await bookApi.update(1, partial);

      expect(mockPatch).toHaveBeenCalledOnce();
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/books/1", { book: partial });
      expect(result).toEqual(updated);
    });
  });

  describe("delete", () => {
    it("calls apiClient.delete with the correct path", async () => {
      mockDelete.mockResolvedValue(undefined);

      await bookApi.delete(42);

      expect(mockDelete).toHaveBeenCalledOnce();
      expect(mockDelete).toHaveBeenCalledWith("/api/v1/books/42");
    });
  });
});
