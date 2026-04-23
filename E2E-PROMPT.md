# E2E Test Project Requirements

## Tool Choice

**Frontend E2E** — Playwright (browser automation, works well with Vite/React, has good TypeScript support)
**Backend E2E** — RSpec request specs scoped to `spec/e2e/` against a real test DB (no mocking). Since RSpec is already in place, a dedicated `spec/e2e/` namespace is the most natural fit.

---

## Infrastructure Requirements

- A separate `docker-compose.e2e.yml` (or `test` profile) spinning up `db`, `api`, and `web` against a **test database** (`library_test`)
- DB reset strategy between test runs — `db:schema:load` + seeds, not `DatabaseCleaner` (too slow for e2e)
- Seed script that creates deterministic fixtures: 1 librarian, 2 members, 10 books with known availability states
- Backend must be reachable at `http://localhost:3000`; frontend at `http://localhost:5173`
- Playwright config targeting the Vite dev server (or a production build served via `vite preview`)

---

## Backend E2E Scenarios (`spec/e2e/`)

These test full HTTP flows against a live Rails + PostgreSQL stack — no mocks, no stubs.

### Auth flows
- Register new user → token returned → subsequent authenticated request succeeds
- Register with duplicate email → 422 with error body
- Login with correct credentials → JWT in `Authorization` header
- Login with wrong password → 401
- Logout → token added to denylist → same token rejected on next request (401)

### Books — full lifecycle
- Librarian creates book → appears in `GET /books` list
- Librarian updates book → `GET /books/:id` reflects changes
- Librarian deletes book with no borrowings → 204, gone from list
- Search by title/author/genre → correct subset returned
- Pagination: page 1 / page 2 return non-overlapping results

### Borrowing lifecycle
- Member borrows available book → `available_copies` decrements by 1
- Member tries to borrow unavailable book → 422 with meaningful error
- Member tries to borrow same book twice → 422 duplicate guard
- Librarian lists all borrowings; member sees only own
- Librarian returns a borrowing → `returned_at` set, `available_copies` increments
- Librarian tries to return already-returned book → 422

### Authorization boundaries
- Member attempts `POST /books` → 403
- Member attempts `DELETE /books/:id` → 403
- Librarian attempts `POST /books/:id/borrowings` → 403
- Member attempts `PATCH /borrowings/:id/return` → 403
- Librarian hits `/dashboard/member` → 403; member hits `/dashboard/librarian` → 403
- Unauthenticated request to any protected endpoint → 401

### Dashboard data accuracy
- After seeding known state, librarian dashboard counts match actual DB counts
- After a member borrows a book, member dashboard `borrowed_books` increments

---

## Frontend E2E Scenarios (Playwright)

These test full user journeys in a real browser against the real API.

### Auth journeys
- `/register` → fill form → submit → redirected to `/dashboard/member`
- `/login` as member → redirected to `/dashboard/member`
- `/login` as librarian → redirected to `/dashboard/librarian`
- Login with wrong password → inline error shown, no redirect
- Logged-in user navigates to `/login` → redirected to dashboard
- Unauthenticated user navigates to `/books` → redirected to `/login`
- Logout → token cleared from localStorage → next navigation to `/books` redirects to `/login`

### Role-based navigation guards
- Member navigates to `/dashboard/librarian` → redirected to `/dashboard/member`
- Librarian navigates to `/dashboard/member` → redirected to `/dashboard/librarian`

### Books list & search
- Books page loads with grid of cards
- Typing in search box (debounce 300ms) filters visible cards
- Clearing search restores full list
- Pagination: "Next" button loads next page; "Previous" returns
- Librarian sees "Add Book", edit, and delete controls; member does not

### Book CRUD (librarian)
- "Add Book" → form → submit → new book appears in list
- Edit book → change title → save → card shows updated title
- Delete book → confirmation dialog → confirm → book removed from list

### Borrow & return lifecycle (cross-role)
- Member sees "Borrow" on available book → clicks → button disabled / book shows reduced copies
- Member visits dashboard → borrowed book appears in personal stats
- Librarian visits dashboard → sees the active borrowing in table
- Librarian clicks "Return" → row updates status; member dashboard decrements count

### Error & loading states
- Spinner visible while books load (slow network simulation)
- API error → user-facing error message displayed (not a blank screen)

---

## Project Structure

```
ballast-lane-test-case/
├── e2e/
│   ├── backend/               # RSpec e2e specs
│   │   ├── spec/
│   │   │   ├── e2e/
│   │   │   │   ├── auth_spec.rb
│   │   │   │   ├── books_spec.rb
│   │   │   │   ├── borrowings_spec.rb
│   │   │   │   └── dashboard_spec.rb
│   │   │   └── support/
│   │   │       └── e2e_helpers.rb  # HTTP client helpers, seed reset
│   │   └── Gemfile (or reuse backend/)
│   └── frontend/              # Playwright project
│       ├── tests/
│       │   ├── auth.spec.ts
│       │   ├── books.spec.ts
│       │   ├── borrowings.spec.ts
│       │   └── dashboard.spec.ts
│       ├── fixtures/
│       │   └── users.ts        # typed fixtures for test accounts
│       ├── pages/              # Page Object Models
│       │   ├── LoginPage.ts
│       │   ├── BooksPage.ts
│       │   └── DashboardPage.ts
│       └── playwright.config.ts
├── docker-compose.e2e.yml
└── e2e                        # unified runner script (mirrors ./test)
```

---

## Key Constraints to Address

| Concern | Approach |
|---|---|
| DB isolation | Full `db:schema:load` + seeds before each e2e run (not per-test) |
| Test data determinism | Fixed seeds: known book titles, known availability counts |
| JWT in Playwright | `storageState` to persist auth token between tests in same role context |
| Overdue/due-today tests | Seed borrowings with past `due_date`; test against fixed date or use DB time manipulation |
| Duplicate borrow guard | Seed one active borrowing before the test that checks rejection |
| CORS | `ALLOWED_ORIGINS` must include Playwright's origin (or use API directly) |
