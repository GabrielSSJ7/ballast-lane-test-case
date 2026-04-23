import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BorrowingRow } from "./BorrowingRow";

const borrowing = {
  id: 1,
  user_id: 1,
  book_id: 1,
  book: {
    id: 1,
    title: "Clean Code",
    author: "Robert Martin",
    genre: "Tech",
    isbn: "123",
    total_copies: 3,
    available_copies: 2,
  },
  borrowed_at: "2024-01-01T00:00:00Z",
  due_at: "2024-01-15T00:00:00Z",
  returned_at: null,
  overdue: false,
};

function renderRow(props: Parameters<typeof BorrowingRow>[0]) {
  return render(
    <table>
      <tbody>
        <BorrowingRow {...props} />
      </tbody>
    </table>
  );
}

describe("BorrowingRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders book title and author", () => {
    renderRow({ borrowing });

    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Robert Martin")).toBeInTheDocument();
  });

  it("shows Active badge when not returned and not overdue", () => {
    renderRow({ borrowing });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(screen.queryByText("Returned")).not.toBeInTheDocument();
  });

  it("shows Overdue badge when overdue is true", () => {
    const overdueBorrowing = { ...borrowing, overdue: true };

    renderRow({ borrowing: overdueBorrowing });

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Returned")).not.toBeInTheDocument();
  });

  it("shows Returned badge when returned_at is set", () => {
    const returnedBorrowing = { ...borrowing, returned_at: "2024-01-10T00:00:00Z" };

    renderRow({ borrowing: returnedBorrowing });

    expect(screen.getByText("Returned")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("renders the actions slot when provided", () => {
    renderRow({
      borrowing,
      actions: <button>Return</button>,
    });

    expect(screen.getByRole("button", { name: "Return" })).toBeInTheDocument();
  });

  it("does not render an actions cell when actions is not provided", () => {
    renderRow({ borrowing });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
