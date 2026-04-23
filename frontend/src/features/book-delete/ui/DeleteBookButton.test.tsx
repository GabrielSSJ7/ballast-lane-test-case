import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DeleteBookButton } from "./DeleteBookButton"
import type { Book } from "../../../entities/book/model/types"

vi.mock("../../../entities/book/api/bookApi", () => ({
  bookApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))

vi.mock("swr", () => ({ default: vi.fn(), mutate: vi.fn() }))

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

import { bookApi } from "../../../entities/book/api/bookApi"
import { mutate } from "swr"
import { ApiError } from "../../../shared/api/client"

const testBook: Book = {
  id: 5,
  title: "Test Book",
  author: "A",
  genre: "G",
  isbn: "123",
  total_copies: 3,
  available_copies: 3,
}

describe("DeleteBookButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders 'Delete' button", () => {
    render(<DeleteBookButton book={testBook} />)
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
  })

  it("when confirm returns false: does NOT call bookApi.delete", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("confirm", vi.fn(() => false))

    render(<DeleteBookButton book={testBook} />)
    await user.click(screen.getByRole("button", { name: /delete/i }))

    expect(bookApi.delete).not.toHaveBeenCalled()
  })

  it("when confirm returns true: calls bookApi.delete, calls mutate, calls onDeleted", async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    vi.mocked(bookApi.delete).mockResolvedValue(undefined)
    vi.mocked(mutate).mockResolvedValue(undefined)

    render(<DeleteBookButton book={testBook} onDeleted={onDeleted} />)
    await user.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledOnce()
    })

    expect(bookApi.delete).toHaveBeenCalledWith(testBook.id)
    expect(mutate).toHaveBeenCalledWith(expect.any(Function))
  })

  it("on 422 ApiError: shows 'Cannot delete — book has active borrowings.'", async () => {
    const user = userEvent.setup()
    vi.mocked(bookApi.delete).mockRejectedValue(new ApiError(422, { error: "Has active borrowings" }))

    render(<DeleteBookButton book={testBook} />)
    await user.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText("Cannot delete — book has active borrowings.")).toBeInTheDocument()
    })
  })

  it("on other error: shows 'Failed to delete book.'", async () => {
    const user = userEvent.setup()
    vi.mocked(bookApi.delete).mockRejectedValue(new Error("Unexpected failure"))

    render(<DeleteBookButton book={testBook} />)
    await user.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText("Failed to delete book.")).toBeInTheDocument()
    })
  })
})
