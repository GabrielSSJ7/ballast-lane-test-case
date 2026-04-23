import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useSWR from "swr";
import { useLibrarianDashboard, useMemberDashboard } from "./useDashboard";

vi.mock("swr", () => ({ default: vi.fn(), mutate: vi.fn() }));

const mockUseSWR = vi.mocked(useSWR);

describe("useLibrarianDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls useSWR with the /api/v1/dashboard/librarian key", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderHook(() => useLibrarianDashboard());

    expect(mockUseSWR).toHaveBeenCalledOnce();
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/dashboard/librarian",
      expect.any(Function)
    );
  });

  it("returns data from useSWR", () => {
    const fakeData = { total_books: 100, total_members: 50, active_borrowings: 10, overdue_borrowings: 2 };
    mockUseSWR.mockReturnValue({ data: fakeData, isLoading: false, error: null } as any);

    const { result } = renderHook(() => useLibrarianDashboard());

    expect(result.current.data).toEqual(fakeData);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useMemberDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls useSWR with the /api/v1/dashboard/member key", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderHook(() => useMemberDashboard());

    expect(mockUseSWR).toHaveBeenCalledOnce();
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/dashboard/member",
      expect.any(Function)
    );
  });

  it("returns data from useSWR", () => {
    const fakeData = { active_borrowings: 3, overdue_borrowings: 1, total_borrowed: 10 };
    mockUseSWR.mockReturnValue({ data: fakeData, isLoading: false, error: null } as any);

    const { result } = renderHook(() => useMemberDashboard());

    expect(result.current.data).toEqual(fakeData);
    expect(result.current.isLoading).toBe(false);
  });
});
