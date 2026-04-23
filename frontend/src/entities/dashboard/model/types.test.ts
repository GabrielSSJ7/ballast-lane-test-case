import { describe, it, expect } from "vitest";
import type { LibrarianDashboard, MemberDashboard } from "./types";

describe("Dashboard types", () => {
  it("LibrarianDashboard has correct shape", () => {
    const dashboard: LibrarianDashboard = {
      total_books: 15,
      total_borrowed: 3,
      due_today: 1,
      members_with_overdue: 2,
    };
    expect(dashboard.total_books).toBe(15);
    expect(dashboard.due_today).toBe(1);
  });

  it("MemberDashboard has correct shape", () => {
    const dashboard: MemberDashboard = {
      borrowed_books: 2,
      overdue_books: 1,
    };
    expect(dashboard.borrowed_books).toBe(2);
  });
});
