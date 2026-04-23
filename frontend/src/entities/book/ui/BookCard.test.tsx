import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { BookCard } from "./BookCard";
import { useAuthStore } from "../../user/model/store";

const book = {
  id: 1,
  title: "Clean Code",
  author: "Robert Martin",
  genre: "Tech",
  isbn: "978-0",
  total_copies: 3,
  available_copies: 2,
};

const bookUnavailable = { ...book, available_copies: 0 };

function renderCard(props: Parameters<typeof BookCard>[0]) {
  return render(
    <MemoryRouter>
      <BookCard {...props} />
    </MemoryRouter>
  );
}

describe("BookCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to unauthenticated state
    useAuthStore.setState({ token: null, user: null });
  });

  it("renders book title and author", () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    });

    renderCard({ book });

    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Robert Martin")).toBeInTheDocument();
  });

  it("shows Borrow button for member when available copies > 0", () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    });

    renderCard({ book, onBorrow: vi.fn() });

    expect(screen.getByRole("button", { name: /borrow/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unavailable/i })).not.toBeInTheDocument();
  });

  it("shows Unavailable button for member when available_copies is 0", () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    });

    renderCard({ book: bookUnavailable });

    expect(screen.getByRole("button", { name: /unavailable/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /borrow/i })).not.toBeInTheDocument();
  });

  it("shows Edit and Delete buttons for librarian", () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 2, name: "Bob", email: "b@b.com", role: "librarian" },
    });

    renderCard({ book, onDelete: vi.fn() });

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not show Borrow or Unavailable for librarian", () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 2, name: "Bob", email: "b@b.com", role: "librarian" },
    });

    renderCard({ book });

    expect(screen.queryByRole("button", { name: /borrow/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unavailable/i })).not.toBeInTheDocument();
  });

  it("calls onBorrow callback with the book when Borrow is clicked", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    });
    const onBorrow = vi.fn();

    renderCard({ book, onBorrow });

    await userEvent.click(screen.getByRole("button", { name: /borrow/i }));

    expect(onBorrow).toHaveBeenCalledOnce();
    expect(onBorrow).toHaveBeenCalledWith(book);
  });

  it("calls onDelete callback with the book when Delete is clicked", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 2, name: "Bob", email: "b@b.com", role: "librarian" },
    });
    const onDelete = vi.fn();

    renderCard({ book, onDelete });

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(book);
  });
});
