import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { DashboardMemberPage } from "./DashboardMemberPage"

vi.mock("../../entities/dashboard/api/useDashboard", () => ({
  useMemberDashboard: vi.fn(),
}))

vi.mock("../../entities/borrowing/api/useBorrowings", () => ({
  useBorrowings: vi.fn(),
}))

vi.mock("../../entities/borrowing/ui/BorrowingRow", () => ({
  BorrowingRow: ({ borrowing }: any) => (
    <tr data-testid="borrowing-row">
      <td>{borrowing.book.title}</td>
    </tr>
  ),
}))

import { useMemberDashboard } from "../../entities/dashboard/api/useDashboard"
import { useBorrowings } from "../../entities/borrowing/api/useBorrowings"

const mockUseMemberDashboard = vi.mocked(useMemberDashboard)
const mockUseBorrowings = vi.mocked(useBorrowings)

const mockStats = {
  borrowed_books: 2,
  overdue_books: 0,
}

const mockBorrowings = [
  {
    id: 1,
    user_id: 1,
    book_id: 1,
    book: {
      id: 1,
      title: "Clean Code",
      author: "Robert Martin",
      genre: "Tech",
      isbn: "111",
      total_copies: 3,
      available_copies: 0,
    },
    borrowed_at: "2024-01-01T00:00:00Z",
    due_at: "2024-01-15T00:00:00Z",
    returned_at: null,
    overdue: false,
  },
]

describe("DashboardMemberPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading spinner when loading stats", () => {
    mockUseMemberDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    // When statsLoading=true, stat cards are replaced by skeletons
    expect(screen.queryByText("Currently Borrowing")).not.toBeInTheDocument()
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
  })

  it("shows 'Currently Borrowing' and 'Overdue Books' stat cards", async () => {
    mockUseMemberDashboard.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Currently Borrowing")).toBeInTheDocument()
    })
    expect(screen.getByText("Overdue Books")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("shows 'no borrowings' message when borrowings are empty", () => {
    mockUseMemberDashboard.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText(
        "You have no borrowings yet. Browse the books catalog to borrow!"
      )
    ).toBeInTheDocument()
  })

  it("shows spinner inside card while borrowings are loading", () => {
    mockUseMemberDashboard.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
  })

  it("shows empty state when borrowings data is undefined (not yet resolved)", () => {
    mockUseMemberDashboard.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText("You have no borrowings yet. Browse the books catalog to borrow!")
    ).toBeInTheDocument()
  })

  it("shows overdue count in red when overdue_books > 0", () => {
    mockUseMemberDashboard.mockReturnValue({
      data: { borrowed_books: 2, overdue_books: 1 },
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    const overdueValue = screen.getByText("1")
    expect(overdueValue.className).toContain("text-red-600")
  })

  it("renders borrowing rows when borrowings exist", async () => {
    mockUseMemberDashboard.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: mockBorrowings,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardMemberPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId("borrowing-row")).toHaveLength(1)
    })
    expect(screen.getByText("Clean Code")).toBeInTheDocument()
  })
})
