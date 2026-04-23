import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReturnButton } from "./ReturnButton"

vi.mock("../../../entities/borrowing/api/borrowingApi", () => ({
  borrowingApi: { returnBook: vi.fn() },
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

import { borrowingApi } from "../../../entities/borrowing/api/borrowingApi"
import { mutate } from "swr"
import { ApiError } from "../../../shared/api/client"

describe("ReturnButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders 'Return' button", () => {
    render(<ReturnButton borrowingId={42} />)
    expect(screen.getByRole("button", { name: /return/i })).toBeInTheDocument()
  })

  it("on click: calls borrowingApi.returnBook(borrowingId), calls mutate, calls onReturned", async () => {
    const user = userEvent.setup()
    const onReturned = vi.fn()
    vi.mocked(borrowingApi.returnBook).mockResolvedValue(undefined)
    vi.mocked(mutate).mockResolvedValue(undefined)

    render(<ReturnButton borrowingId={42} onReturned={onReturned} />)
    await user.click(screen.getByRole("button", { name: /return/i }))

    await waitFor(() => {
      expect(onReturned).toHaveBeenCalledOnce()
    })

    expect(borrowingApi.returnBook).toHaveBeenCalledWith(42)
    expect(mutate).toHaveBeenCalledWith("/api/v1/borrowings")
    expect(mutate).toHaveBeenCalledWith(expect.any(Function))
    expect(mutate).toHaveBeenCalledWith("/api/v1/dashboard/librarian")
  })

  it("on ApiError: shows error from data.error", async () => {
    const user = userEvent.setup()
    vi.mocked(borrowingApi.returnBook).mockRejectedValue(
      new ApiError(422, { error: "This book was already returned." })
    )

    render(<ReturnButton borrowingId={42} />)
    await user.click(screen.getByRole("button", { name: /return/i }))

    await waitFor(() => {
      expect(screen.getByText("This book was already returned.")).toBeInTheDocument()
    })
  })

  it("on generic error: shows 'Failed to return book.'", async () => {
    const user = userEvent.setup()
    vi.mocked(borrowingApi.returnBook).mockRejectedValue(new Error("Unexpected failure"))

    render(<ReturnButton borrowingId={42} />)
    await user.click(screen.getByRole("button", { name: /return/i }))

    await waitFor(() => {
      expect(screen.getByText("Failed to return book.")).toBeInTheDocument()
    })
  })
})
