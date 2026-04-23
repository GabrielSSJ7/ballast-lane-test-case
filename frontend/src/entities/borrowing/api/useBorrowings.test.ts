import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useSWR from "swr";
import { useBorrowings } from "./useBorrowings";

vi.mock("swr", () => ({ default: vi.fn(), mutate: vi.fn() }));

const mockUseSWR = vi.mocked(useSWR);

const fakeBorrowings = [
  {
    id: 1,
    user_id: 1,
    book_id: 1,
    book: { id: 1, title: "Clean Code", author: "Robert Martin", genre: "Tech", isbn: "123", total_copies: 3, available_copies: 2 },
    borrowed_at: "2024-01-01T00:00:00Z",
    due_at: "2024-01-15T00:00:00Z",
    returned_at: null,
    overdue: false,
  },
];

describe("useBorrowings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls useSWR with the /api/v1/borrowings key", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderHook(() => useBorrowings());

    expect(mockUseSWR).toHaveBeenCalledOnce();
    expect(mockUseSWR).toHaveBeenCalledWith("/api/v1/borrowings", expect.any(Function));
  });

  it("returns data from useSWR", () => {
    mockUseSWR.mockReturnValue({ data: fakeBorrowings, isLoading: false, error: null } as any);

    const { result } = renderHook(() => useBorrowings());

    expect(result.current.data).toEqual(fakeBorrowings);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns loading state when data is not yet available", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    const { result } = renderHook(() => useBorrowings());

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});
