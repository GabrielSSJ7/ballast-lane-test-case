import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { BookForm } from "./BookForm"
import type { Book } from "../../../entities/book/model/types"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("../../../entities/book/api/bookApi", () => ({
  bookApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))

vi.mock("swr", () => ({ default: vi.fn(), mutate: vi.fn() }))

import { bookApi } from "../../../entities/book/api/bookApi"

const existingBook: Book = {
  id: 1,
  title: "Old Title",
  author: "Author",
  genre: "Genre",
  isbn: "123",
  total_copies: 2,
  available_copies: 2,
}

describe("BookForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("create mode (no book prop)", () => {
    it("renders 'Create Book' button and form fields", () => {
      render(
        <MemoryRouter>
          <BookForm />
        </MemoryRouter>
      )

      expect(screen.getByRole("button", { name: /create book/i })).toBeInTheDocument()
      expect(screen.getByLabelText("Title")).toBeInTheDocument()
      expect(screen.getByLabelText("Author")).toBeInTheDocument()
      expect(screen.getByLabelText("Genre")).toBeInTheDocument()
      expect(screen.getByLabelText("ISBN")).toBeInTheDocument()
      expect(screen.getByLabelText("Total Copies")).toBeInTheDocument()
    })

    it("on create submit: calls bookApi.create and navigates to /books", async () => {
      const user = userEvent.setup()
      vi.mocked(bookApi.create).mockResolvedValue(undefined)

      render(
        <MemoryRouter>
          <BookForm />
        </MemoryRouter>
      )

      await user.type(screen.getByLabelText("Title"), "New Book")
      await user.type(screen.getByLabelText("Author"), "New Author")
      await user.type(screen.getByLabelText("Genre"), "Fiction")
      await user.type(screen.getByLabelText("ISBN"), "978-0000000000")
      await user.clear(screen.getByLabelText("Total Copies"))
      await user.type(screen.getByLabelText("Total Copies"), "5")
      await user.click(screen.getByRole("button", { name: /create book/i }))

      await waitFor(() => {
        expect(bookApi.create).toHaveBeenCalledWith({
          title: "New Book",
          author: "New Author",
          genre: "Fiction",
          isbn: "978-0000000000",
          total_copies: 5,
        })
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/books")
      })
    })
  })

  describe("edit mode (with book prop)", () => {
    it("renders 'Update Book' button and pre-fills form fields", () => {
      render(
        <MemoryRouter>
          <BookForm book={existingBook} />
        </MemoryRouter>
      )

      expect(screen.getByRole("button", { name: /update book/i })).toBeInTheDocument()
      expect(screen.getByLabelText<HTMLInputElement>("Title").value).toBe("Old Title")
      expect(screen.getByLabelText<HTMLInputElement>("Author").value).toBe("Author")
      expect(screen.getByLabelText<HTMLInputElement>("Genre").value).toBe("Genre")
      expect(screen.getByLabelText<HTMLInputElement>("ISBN").value).toBe("123")
      expect(screen.getByLabelText<HTMLInputElement>("Total Copies").value).toBe("2")
    })

    it("on edit submit: calls bookApi.update with book.id", async () => {
      const user = userEvent.setup()
      vi.mocked(bookApi.update).mockResolvedValue(undefined)

      render(
        <MemoryRouter>
          <BookForm book={existingBook} />
        </MemoryRouter>
      )

      await user.clear(screen.getByLabelText("Title"))
      await user.type(screen.getByLabelText("Title"), "Updated Title")
      await user.click(screen.getByRole("button", { name: /update book/i }))

      await waitFor(() => {
        expect(bookApi.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ title: "Updated Title" })
        )
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/books")
      })
    })
  })

  it("on cancel: navigates to /books", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BookForm />
      </MemoryRouter>
    )

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(mockNavigate).toHaveBeenCalledWith("/books")
  })

  it("shows all field validation errors when form is submitted empty", async () => {
    render(
      <MemoryRouter>
        <BookForm />
      </MemoryRouter>
    )

    // fireEvent.submit bypasses HTML5 min="0" constraint on the number input,
    // letting react-hook-form's Zod resolver run and surface all field errors
    fireEvent.change(screen.getByLabelText("Total Copies"), { target: { value: "-1" } })
    fireEvent.submit(document.querySelector("form")!)

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument()
      expect(screen.getByText("Author is required")).toBeInTheDocument()
      expect(screen.getByText("Genre is required")).toBeInTheDocument()
      expect(screen.getByText("ISBN is required")).toBeInTheDocument()
      expect(screen.getByText("Must be 0 or more")).toBeInTheDocument()
    })
    expect(bookApi.create).not.toHaveBeenCalled()
  })

  it("shows 'Something went wrong' when a non-Error is thrown", async () => {
    const user = userEvent.setup()
    vi.mocked(bookApi.create).mockRejectedValue("unexpected failure")

    render(
      <MemoryRouter>
        <BookForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Title"), "Book")
    await user.type(screen.getByLabelText("Author"), "Author")
    await user.type(screen.getByLabelText("Genre"), "Fiction")
    await user.type(screen.getByLabelText("ISBN"), "978")
    await user.clear(screen.getByLabelText("Total Copies"))
    await user.type(screen.getByLabelText("Total Copies"), "1")
    await user.click(screen.getByRole("button", { name: /create book/i }))

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("on API error: shows error message", async () => {
    const user = userEvent.setup()
    vi.mocked(bookApi.create).mockRejectedValue(new Error("Server error occurred"))

    render(
      <MemoryRouter>
        <BookForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Title"), "New Book")
    await user.type(screen.getByLabelText("Author"), "New Author")
    await user.type(screen.getByLabelText("Genre"), "Fiction")
    await user.type(screen.getByLabelText("ISBN"), "978-0000000000")
    await user.clear(screen.getByLabelText("Total Copies"))
    await user.type(screen.getByLabelText("Total Copies"), "5")
    await user.click(screen.getByRole("button", { name: /create book/i }))

    await waitFor(() => {
      expect(screen.getByText("Server error occurred")).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
