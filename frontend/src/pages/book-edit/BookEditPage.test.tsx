import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { BookEditPage } from "./BookEditPage"

vi.mock("../../entities/book/api/useBooks", () => ({
  useBook: vi.fn(),
}))

vi.mock("../../features/book-create/ui/BookForm", () => ({
  BookForm: ({ book }: any) => (
    <div data-testid="book-form">{book ? "edit-mode" : "create-mode"}</div>
  ),
}))

import { useBook } from "../../entities/book/api/useBooks"
const mockUseBook = vi.mocked(useBook)

const mockBook = {
  id: 1,
  title: "Clean Code",
  author: "Robert Martin",
  genre: "Tech",
  isbn: "9780132350884",
  total_copies: 5,
  available_copies: 3,
}

describe("BookEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows 'Add New Book' heading when no id param", () => {
    mockUseBook.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter>
        <BookEditPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Add New Book")).toBeInTheDocument()
  })

  it("shows 'Edit Book' heading when id is provided", async () => {
    mockUseBook.mockReturnValue({
      data: mockBook,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter initialEntries={["/books/1/edit"]}>
        <Routes>
          <Route path="/books/:id/edit" element={<BookEditPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Edit Book")).toBeInTheDocument()
    })
  })

  it("shows Spinner while loading in edit mode", () => {
    mockUseBook.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(
      <MemoryRouter initialEntries={["/books/1/edit"]}>
        <Routes>
          <Route path="/books/:id/edit" element={<BookEditPage />} />
        </Routes>
      </MemoryRouter>
    )

    // When isEditing && isLoading, the component returns only the spinner
    expect(screen.queryByText("Edit Book")).not.toBeInTheDocument()
    expect(screen.queryByText("Add New Book")).not.toBeInTheDocument()
    // Spinner container is rendered
    expect(document.querySelector(".flex.justify-center")).toBeInTheDocument()
  })

  it("passes book to BookForm when in edit mode", async () => {
    mockUseBook.mockReturnValue({
      data: mockBook,
      isLoading: false,
      error: null,
    } as any)

    render(
      <MemoryRouter initialEntries={["/books/1/edit"]}>
        <Routes>
          <Route path="/books/:id/edit" element={<BookEditPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId("book-form")).toHaveTextContent("edit-mode")
    })
  })
})
