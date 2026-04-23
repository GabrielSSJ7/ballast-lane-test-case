import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BorrowButton } from "./BorrowButton"
import type { Book } from "../../../entities/book/model/types"

vi.mock("../../../shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    rawPost: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public data: unknown) {
      super(`API ${status}`)
    }
  },
}))

vi.mock("swr", () => ({ default: vi.fn(), mutate: vi.fn() }))

import { apiClient, ApiError } from "../../../shared/api/client"
import { mutate } from "swr"

const testBook: Book = {
  id: 5,
  title: "Test Book",
  author: "A",
  genre: "G",
  isbn: "123",
  total_copies: 3,
  available_copies: 2,
}

describe("BorrowButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders 'Borrow' button", () => {
    render(<BorrowButton book={testBook} />)
    expect(screen.getByRole("button", { name: /borrow/i })).toBeInTheDocument()
  })

  it("on click: calls apiClient.post with correct URL", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue(undefined)
    vi.mocked(mutate).mockResolvedValue(undefined)

    render(<BorrowButton book={testBook} />)
    await user.click(screen.getByRole("button", { name: /borrow/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/books/5/borrowings")
    })
  })

  it("on success: calls mutate to invalidate cache and calls onBorrowed callback", async () => {
    const user = userEvent.setup()
    const onBorrowed = vi.fn()
    vi.mocked(apiClient.post).mockResolvedValue(undefined)
    vi.mocked(mutate).mockResolvedValue(undefined)

    render(<BorrowButton book={testBook} onBorrowed={onBorrowed} />)
    await user.click(screen.getByRole("button", { name: /borrow/i }))

    await waitFor(() => {
      expect(onBorrowed).toHaveBeenCalledOnce()
    })

    expect(mutate).toHaveBeenCalledWith("/api/v1/borrowings")
    expect(mutate).toHaveBeenCalledWith(expect.any(Function))
  })

  it("on ApiError: shows error message from data.error", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(
      new ApiError(422, { error: "You already have this book borrowed." })
    )

    render(<BorrowButton book={testBook} />)
    await user.click(screen.getByRole("button", { name: /borrow/i }))

    await waitFor(() => {
      expect(screen.getByText("You already have this book borrowed.")).toBeInTheDocument()
    })
  })

  it("on generic error: shows 'Failed to borrow book.'", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Something went wrong"))

    render(<BorrowButton book={testBook} />)
    await user.click(screen.getByRole("button", { name: /borrow/i }))

    await waitFor(() => {
      expect(screen.getByText("Failed to borrow book.")).toBeInTheDocument()
    })
  })
})
