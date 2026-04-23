import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useSWR from "swr";
import { useBooks, useBook } from "./useBooks";

vi.mock("swr", () => ({ default: vi.fn(), mutate: vi.fn() }));

const mockUseSWR = vi.mocked(useSWR);

const fakeBooksResponse = {
  data: [{ id: 1, title: "Clean Code", author: "Robert Martin", genre: "Tech", isbn: "978-0", total_copies: 3, available_copies: 2 }],
  meta: { total: 1, page: 1, per_page: 10, total_pages: 1 },
};

describe("useBooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data from useSWR", () => {
    mockUseSWR.mockReturnValue({ data: fakeBooksResponse, isLoading: false, error: null } as any);

    const { result } = renderHook(() => useBooks("clean", 1));

    expect(result.current.data).toEqual(fakeBooksResponse);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("passes the correct SWR key with query and page", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderHook(() => useBooks("react", 2));

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/books?q=react&page=2",
      expect.any(Function)
    );
  });

  it("builds the key with empty query when query is undefined", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderHook(() => useBooks(undefined, 1));

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/books?q=&page=1",
      expect.any(Function)
    );
  });
});

describe("useBook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the correct key for a valid id", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderHook(() => useBook(5));

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/books/5",
      expect.any(Function)
    );
  });

  it("passes null as key when id is 0 (skip fetch)", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: null } as any);

    renderHook(() => useBook(0));

    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("returns data from useSWR", () => {
    const book = { id: 1, title: "Clean Code", author: "Robert Martin", genre: "Tech", isbn: "978-0", total_copies: 3, available_copies: 2 };
    mockUseSWR.mockReturnValue({ data: book, isLoading: false, error: null } as any);

    const { result } = renderHook(() => useBook(1));

    expect(result.current.data).toEqual(book);
  });
});
