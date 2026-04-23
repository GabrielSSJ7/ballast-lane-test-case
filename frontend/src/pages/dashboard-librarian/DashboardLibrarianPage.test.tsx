import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { DashboardLibrarianPage } from "./DashboardLibrarianPage"

vi.mock("../../entities/dashboard/api/useDashboard", () => ({
  useLibrarianDashboard: vi.fn(),
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

vi.mock("../../features/book-return/ui/ReturnButton", () => ({
  ReturnButton: () => <button>Return</button>,
}))

import { useLibrarianDashboard } from "../../entities/dashboard/api/useDashboard"
import { useBorrowings } from "../../entities/borrowing/api/useBorrowings"

const mockUseLibrarianDashboard = vi.mocked(useLibrarianDashboard)
const mockUseBorrowings = vi.mocked(useBorrowings)

const mockStats = {
  total_books: 10,
  total_borrowed: 3,
  due_today: 1,
  members_with_overdue: 2,
}

const borrowings = [
  {
    id: 1,
    user_id: 1,
    book_id: 1,
    book: {
      id: 1,
      title: "Book A",
      author: "A",
      genre: "G",
      isbn: "1",
      total_copies: 1,
      available_copies: 0,
    },
    borrowed_at: "2024-01-01T00:00:00Z",
    due_at: "2024-01-15T00:00:00Z",
    returned_at: null,
    overdue: false,
  },
  {
    id: 2,
    user_id: 2,
    book_id: 2,
    book: {
      id: 2,
      title: "Book B",
      author: "B",
      genre: "G",
      isbn: "2",
      total_copies: 1,
      available_copies: 1,
    },
    borrowed_at: "2024-01-01T00:00:00Z",
    due_at: "2024-01-15T00:00:00Z",
    returned_at: "2024-01-10T00:00:00Z",
    overdue: false,
  },
]

describe("DashboardLibrarianPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading spinner when loading stats", () => {
    mockUseLibrarianDashboard.mockReturnValue({
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
        <DashboardLibrarianPage />
      </MemoryRouter>
    )

    // When statsLoading=true the stat cards are not rendered
    expect(screen.queryByText("Total Books")).not.toBeInTheDocument()
    expect(document.querySelector(".flex.justify-center")).toBeInTheDocument()
  })

  it("shows stat cards when stats are loaded", async () => {
    mockUseLibrarianDashboard.mockReturnValue({
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
        <DashboardLibrarianPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Total Books")).toBeInTheDocument()
    })
    expect(screen.getByText("Currently Borrowed")).toBeInTheDocument()
    expect(screen.getByText("Due Today")).toBeInTheDocument()
    expect(screen.getByText("Members with Overdue")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("shows 'No active borrowings' when no active borrowings", () => {
    mockUseLibrarianDashboard.mockReturnValue({
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
        <DashboardLibrarianPage />
      </MemoryRouter>
    )

    expect(screen.getByText("No active borrowings.")).toBeInTheDocument()
  })

  it("shows spinner inside card while borrowings are loading", () => {
    mockUseLibrarianDashboard.mockReturnValue({
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
        <DashboardLibrarianPage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText("Loading")).toBeInTheDocument()
  })

  it("renders borrowing rows only for active borrowings (returned_at=null)", async () => {
    mockUseLibrarianDashboard.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)
    mockUseBorrowings.mockReturnValue({
      data: borrowings,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <DashboardLibrarianPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId("borrowing-row")).toHaveLength(1)
    })
    // Only the active borrowing (Book A) should appear
    expect(screen.getByText("Book A")).toBeInTheDocument()
    expect(screen.queryByText("Book B")).not.toBeInTheDocument()
  })
})
