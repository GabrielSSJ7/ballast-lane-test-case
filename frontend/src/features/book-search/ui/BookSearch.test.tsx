import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { BookSearch } from "./BookSearch"

describe("BookSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders input with default placeholder", () => {
    render(<BookSearch value="" onChange={vi.fn()} />)

    expect(
      screen.getByPlaceholderText("Search by title, author, or genre...")
    ).toBeInTheDocument()
  })

  it("renders input with custom placeholder", () => {
    render(<BookSearch value="" onChange={vi.fn()} placeholder="Search books..." />)

    expect(screen.getByPlaceholderText("Search books...")).toBeInTheDocument()
  })

  it("calls onChange when user types", () => {
    const handleChange = vi.fn()

    render(<BookSearch value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText("Search by title, author, or genre...")
    fireEvent.change(input, { target: { value: "Harry Potter" } })

    expect(handleChange).toHaveBeenCalledWith("Harry Potter")
  })

  it("uses provided value", () => {
    render(<BookSearch value="existing search" onChange={vi.fn()} />)

    const input = screen.getByPlaceholderText(
      "Search by title, author, or genre..."
    ) as HTMLInputElement
    expect(input.value).toBe("existing search")
  })
})
