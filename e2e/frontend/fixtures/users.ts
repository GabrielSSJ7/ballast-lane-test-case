export const USERS = {
  librarian: {
    email: "e2e_librarian@library.com",
    password: "password123",
    role: "librarian" as const,
  },
  member1: {
    email: "e2e_member1@library.com",
    password: "password123",
    role: "member" as const,
  },
  member2: {
    email: "e2e_member2@library.com",
    password: "password123",
    role: "member" as const,
  },
} as const;

export const BOOKS = {
  available: { isbn: "E2E-001", title: "E2E Book One" },
  available2: { isbn: "E2E-002", title: "E2E Book Two" },
  borrowed: { isbn: "E2E-008", title: "E2E Borrowed Book" },
  unavailable: { isbn: "E2E-009", title: "E2E Unavailable Book" },
  overdue: { isbn: "E2E-010", title: "E2E Overdue Book" },
} as const;
