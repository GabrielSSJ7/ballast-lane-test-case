# Phase 2 — E2E Test Suite

All work delivered on 2026-04-23, building a full end-to-end test suite on top of the Phase 1 application: RSpec-based backend API E2E specs, Playwright-based frontend browser tests, a dedicated Docker Compose environment, and a unified runner script.

---

## Goals

- Verify the full stack works as an integrated system — not just units in isolation
- Cover every user-facing flow: auth, book browsing, borrowing lifecycle, dashboard stats, and authorization boundaries
- Run against real infrastructure (real database, real API, real browser) with zero mocks
- Produce a single `./run-e2e` command that resets state, runs both suites, and exits 0 iff everything passes

---

## Repository Structure Added

```
ballast-lane-test-case/
├── run-e2e                          # Unified E2E runner script
├── docker-compose.e2e.yml           # Isolated E2E stack (separate ports/volumes)
├── backend/
│   ├── db/seeds/e2e.rb              # Deterministic seed data for E2E runs
│   └── spec/
│       ├── e2e/
│       │   ├── auth_spec.rb
│       │   ├── books_spec.rb
│       │   ├── borrowings_spec.rb
│       │   ├── dashboard_spec.rb
│       │   └── authorization_spec.rb
│       └── support/
│           └── database_cleaner.rb  # Extended for E2E seeding
└── e2e/
    └── frontend/
        ├── package.json
        ├── playwright.config.ts
        ├── global-setup.ts
        ├── fixtures/
        │   └── users.ts
        ├── pages/
        │   ├── LoginPage.ts
        │   ├── BooksPage.ts
        │   └── DashboardPage.ts
        └── tests/
            ├── auth.spec.ts
            ├── books.spec.ts
            └── borrowings.spec.ts
```

---

## Infrastructure

### `docker-compose.e2e.yml`

A fully isolated Docker Compose stack that can coexist with the development stack:

| Service | Image | Ports | Notes |
|---------|-------|-------|-------|
| `db` | postgres:16-alpine | — | `POSTGRES_DB=library_test`, health-checked |
| `api` | `library-e2e-api` (built from `./backend`) | `3001:3000` | `RAILS_ENV=test`, separate from dev port 3000 |
| `web` | `library-e2e-web` (built from `./frontend`) | `5174:5173` | Vite dev server, `VITE_API_URL=http://localhost:3001` |

Key design decisions:
- **Project name `library-e2e`** (`name:` field in the file) — Docker uses this as the container/image/volume prefix, keeping all E2E artifacts completely separate from the dev stack (`ballast-lane-test-case-*`)
- **Separate named volumes** — `pg_data_e2e`, `bundle_cache_e2e`, `node_modules_e2e` — dev and E2E gem caches never collide
- **`ALLOWED_ORIGINS`** on the API covers `http://localhost:5174`, `http://localhost:4173`, and `http://localhost:3001` so Playwright can reach the API regardless of which port the browser navigates from

### `run-e2e`

Shell script at the project root that orchestrates the entire flow:

```bash
./run-e2e           # run backend then frontend
./run-e2e backend   # RSpec only
./run-e2e frontend  # Playwright only (extra args forwarded: --headed, --ui, etc.)
```

Backend step:
1. `rails db:schema:load RAILS_ENV=test` — drops and recreates all tables, giving a clean slate
2. `bundle exec rspec spec/e2e/ --format documentation` — runs all E2E specs

Frontend step:
1. Auto-installs `node_modules` if missing (`npm install`)
2. Installs Chromium with system deps (`npx playwright install chromium --with-deps`)
3. Runs `npx playwright test` forwarding any extra CLI arguments

---

## E2E Seed Data (`backend/db/seeds/e2e.rb`)

Deterministic, named fixtures so every spec and test can reference data by known email / ISBN:

### Users

| Email | Password | Role |
|-------|----------|------|
| `e2e_librarian@library.com` | `password123` | librarian |
| `e2e_member1@library.com` | `password123` | member |
| `e2e_member2@library.com` | `password123` | member |

### Books

| ISBN | Title | total_copies | State |
|------|-------|-------------|-------|
| E2E-001..007 | E2E Book One…Seven | 3 | fully available |
| E2E-008 | E2E Borrowed Book | 3 | 1 active borrow by member1 → available=2 |
| E2E-009 | E2E Unavailable Book | 1 | 1 active borrow by member2 → available=0 |
| E2E-010 | E2E Overdue Book | 2 | 1 overdue borrow by member1 → available=1 |
| E2E-011..025 | E2E Filler Book 11…25 | 2 | filler for pagination (25 total books) |

### Borrowings

| User | Book | Status |
|------|------|--------|
| member1 | E2E-008 | Active — due in 11 days |
| member2 | E2E-009 | Active — due in 9 days |
| member1 | E2E-010 | **Overdue** — due 7 days ago |

The seed file truncates all tables in FK-safe order before inserting (`JwtDenylist → Borrowing → Book → User`), making it safe to re-run at any point.

---

## DatabaseCleaner Extension (`backend/spec/support/database_cleaner.rb`)

Two changes were needed to support E2E specs alongside unit/request specs:

1. **Seeding in `before(:suite)`** — after `clean_with(:truncation)` wipes the database, E2E seeds are loaded if any file in the run includes `spec/e2e`:

```ruby
config.before(:suite) do
  DatabaseCleaner.strategy = :transaction
  DatabaseCleaner.clean_with(:truncation)
  if RSpec.configuration.files_to_run.any? { |f| f.include?("spec/e2e") }
    load Rails.root.join("db/seeds/e2e.rb")
  end
end
```

2. **No transaction wrapping for E2E specs** — regular specs run inside a transaction that rolls back after each example. E2E specs are tagged `e2e: true` and bypass this so seed data persists across examples in the suite:

```ruby
config.around(:each) do |example|
  if example.metadata[:e2e]
    example.run
  else
    DatabaseCleaner.cleaning { example.run }
  end
end
```

---

## Backend E2E Specs (`backend/spec/e2e/`)

All specs are tagged `type: :request, e2e: true`. Users are looked up by email (`User.find_by!(email: ...)`) so specs are immune to ID instability across seed runs.

### `auth_spec.rb` — 7 examples

| Scenario | Assertion |
|----------|-----------|
| Register with fresh email | 201, JWT in `Authorization` header, token works immediately |
| Register duplicate email | 422, `errors` key in body |
| Login with correct credentials | 200, JWT in header |
| Login wrong password | 401 |
| Login non-existent email | 401 |
| Logout flow | Token works before logout; returns 204; same token rejected with 401 after |

### `books_spec.rb` — 9 examples

| Scenario | Assertion |
|----------|-----------|
| List books (unauthenticated) | 200, array with all 25 books |
| Pagination (page 2) | Correct subset, `meta` object present |
| Search by title ("E2E Book One") | Returns matching book |
| Get single book | 200, correct attributes |
| Create book (librarian) | 201, book persisted |
| Create book (member) | 403 |
| Update book (librarian) | 200, title updated |
| Update book (member) | 403 |
| Delete book (librarian) | 204, book gone |

### `borrowings_spec.rb` — 9 examples

| Scenario | Assertion |
|----------|-----------|
| Borrow available book (member1 borrows E2E-001) | 201, `available_copies` decremented; `after` restores seed state |
| Borrow unavailable book (E2E-009, available=0) | 422 "not available" |
| Borrow duplicate active borrowing (E2E-008) | 422 "already have an active borrowing" |
| List borrowings (librarian) | 200, sees all ≥3 borrowings across multiple users |
| List borrowings (member2) | 200, sees only own borrowings |
| Return active borrowing (librarian returns E2E-003 fresh borrow) | 200, `returned_at` set, `available_copies` incremented |
| Return already-returned borrowing | 422 "already returned" |

### `dashboard_spec.rb` — 6 examples

| Scenario | Assertion |
|----------|-----------|
| Librarian dashboard | `total_books: 25`, `total_borrowed: 3`, `members_with_overdue: 1` |
| Librarian dashboard (member token) | 403 |
| Member dashboard (member1) | `borrowed_books: 2`, `overdue_books: 1` |
| Member dashboard (librarian token) | 403 |
| Borrowings list (librarian) | Sees all 3 seeded borrowings |
| Borrowings list (member1) | Sees only own 2 borrowings |

### `authorization_spec.rb` — 9 examples

Cross-role and unauthenticated boundary tests:

| Scenario | Status |
|----------|--------|
| Member tries to create book | 403 |
| Member tries to update book | 403 |
| Member tries to delete book | 403 |
| Member tries to return borrowing | 403 |
| Librarian tries to borrow book | 403 |
| Unauthenticated GET /books | 200 (public) |
| Unauthenticated POST /books | 401 |
| Unauthenticated GET /borrowings | 401 |
| Unauthenticated GET /dashboard/librarian | 401 |

**Total: 40 examples, 0 failures**

---

## Frontend E2E Tests (`e2e/frontend/`)

### Technology

- **Playwright 1.50** with Chromium
- Single worker (`workers: 1`), no parallelism — tests share database state
- `globalSetup` runs before all tests to pre-generate auth state files

### `playwright.config.ts`

```
baseURL:           http://localhost:5174
globalSetup:       ./global-setup
workers:           1
fullyParallel:     false
retries:           0
actionTimeout:     10 000 ms
navigationTimeout: 15 000 ms
timeout:           30 000 ms
projects:          chromium only
```

One project (chromium) ensures tests run exactly once. Earlier iterations had 4 projects, causing every test to run 4×.

### `global-setup.ts`

Runs once before any test. Calls `POST http://localhost:3001/api/v1/auth/login` for each user, strips the `Bearer ` prefix (matching how `LoginForm` stores tokens), and writes three Playwright storage-state files:

- `playwright/.auth/librarian.json`
- `playwright/.auth/member.json`
- `playwright/.auth/member2.json`

Each file contains the localStorage entry `auth` in Zustand-persist format:
```json
{ "state": { "token": "eyJ...", "user": { "id": 1, "role": "librarian", ... } }, "version": 0 }
```

### `fixtures/users.ts`

Named constants for all E2E users and the key seeded books, used across all spec files:

```typescript
USERS.librarian  → e2e_librarian@library.com / password123
USERS.member1    → e2e_member1@library.com / password123
USERS.member2    → e2e_member2@library.com / password123

BOOKS.available     → E2E-001 / "E2E Book One"
BOOKS.borrowed      → E2E-008 / "E2E Borrowed Book"
BOOKS.unavailable   → E2E-009 / "E2E Unavailable Book"
BOOKS.overdue       → E2E-010 / "E2E Overdue Book"
```

### Page Objects

#### `LoginPage.ts`
- `goto()` / `login(email, password)` / `submit()`
- `getErrorText()` — waits up to 5 s for `p.text-red-600` before reading (avoids race with API response)

#### `BooksPage.ts`
- `goto()` / `waitForLoad()` — waits for `.grid h3` or `.text-center`
- `search(query)` / `clearSearch()` — fills `input[type="search"]`, waits 400 ms for debounce
- `getBookTitles()` — returns all `.grid h3` text contents
- `findCardByTitle(title)` — locates `.grid > div` containing `h3:text-is("…")`
- `clickEdit(title)` — chains `card.locator('a').locator('button:text("Edit")')` and waits for URL `/books/:id/edit`
- `clickDelete(title)` — registers `page.once("dialog", accept)` then clicks Delete button
- `clickNextPage()` — clicks Next and waits for `text=Page 2 of` (page indicator DOM change)
- `clickPrevPage()` — clicks Previous and waits for `text=Page 1 of` (SWR serves page 1 from cache — no network request fires, so `waitForResponse` would time out)

#### `DashboardPage.ts`
- `goto(role)` — navigates to `/dashboard/:role`, waits for `p.text-3xl`
- `getStatValue(labelText)` — finds the label `<p>` by exact text, then uses XPath `following-sibling::p[1]` to get the adjacent value paragraph

  The initial implementation used `page.locator("div").filter({ has: label }).first()`. This matched the outermost grid `div` (which contains all 4 stat cards), so `locator("p.text-3xl")` then resolved to all 4 value elements at once, causing a strict-mode violation. The XPath sibling selector is precise and unambiguous.

- `clickReturn(bookTitle)` — finds `tbody tr` containing `p:text-is(title)` and clicks its Return button

### `tests/auth.spec.ts` — 10 tests

| Describe | Test | Notes |
|----------|------|-------|
| Guest | Register new member → redirects to `/dashboard/member` | Uses unique timestamp email |
| Guest | Unauthenticated → `/books` → redirected to `/login` | |
| Guest | Wrong password → inline error shown | `getErrorText()` waits for error element |
| **Logout flow** | Fresh login via UI → logout → `/books` redirects to `/login` | Uses `storageState: { cookies: [], origins: [] }` and logs in via UI to get a fresh token; the pre-saved `member.json` token is never blacklisted |
| Member | `/` → `/dashboard/member` | |
| Member | `/login` (authenticated) → `/dashboard/member` | Router loader on `/login` redirects authenticated users |
| Member | `/dashboard/librarian` → redirected back to `/dashboard/member` | |
| Librarian | `/` → `/dashboard/librarian` | |
| Librarian | `/login` (authenticated) → `/dashboard/librarian` | |
| Librarian | `/dashboard/member` → redirected back to `/dashboard/librarian` | |

**Why the logout test is isolated:** Using the pre-saved `member.json` token to perform a logout call blacklists that JTI. All subsequent tests that load `member.json` then get 401 on every API call, causing cascading failures across the borrowings suite. The fix is to log in fresh via UI (gets a new, unreserved token) and log out that instead.

### `tests/books.spec.ts` — 15 tests

| Describe | Test |
|----------|------|
| Guest | `/books` redirects to `/login` |
| Member | Books page loads ≥ 10 cards |
| Member | Search "E2E Borrowed" filters to fewer, matching results |
| Member | Clearing search restores more books |
| Member | No "Add Book" button visible |
| Member | Available book shows Borrow button |
| Member | Unavailable book shows disabled Unavailable button |
| Librarian | "Add Book" button visible |
| Librarian | Edit and Delete buttons visible on cards |
| Librarian | Create new book → appears in list after search |
| Librarian | Edit book title → updated title appears in list (restored after) |
| Librarian | Create book → search → delete → verify gone |
| Librarian | Pagination: Next loads different books, Previous returns to first page |

### `tests/borrowings.spec.ts` — 9 tests

| Describe | Test |
|----------|------|
| Member2 borrow flow | Borrow button visible on E2E Book Six; click succeeds |
| Member2 borrow flow | Member2 dashboard shows ≥ 1 currently borrowing |
| Librarian borrowings | Dashboard shows table with ≥ 3 rows |
| Librarian borrowings | **Return test** — creates a fresh E2E Book Two borrowing via API, returns it, row count decreases by 1 |
| Librarian borrowings | Currently Borrowed stat ≥ 3 |
| Librarian sees member borrowings | Table is non-empty, has content |
| Member1 borrowings state | Dashboard shows ≥ 2 currently borrowing |
| Member1 borrowings state | Table has ≥ 2 rows |
| Member1 borrowings state | E2E-009 (unavailable) shows disabled Unavailable button |

**Why the return test creates a fresh borrowing:** The three seeded borrowings belong to member1. Returning any of them causes the "member1 has ≥ 2 borrowings" test to fail. The fix: inside the return test, read `playwright/.auth/member2.json`, extract the token, call `GET /api/v1/books?search=E2E+Book+Two` to resolve the book ID, call `POST /api/v1/books/:id/borrowings` to create a dedicated throwaway borrowing, then return only that one — leaving all seeded borrowings intact.

**Total: 44 tests, 0 failures**

---

## Production Code Changes

Two production files were modified to make the test scenarios pass:

### `frontend/src/app/router.tsx`

Added a `loader` to the `/login` route that redirects authenticated users to their role-specific dashboard:

```typescript
{
  path: "/login",
  loader: () => {
    const { token, user } = useAuthStore.getState();
    if (token) return redirect(
      user?.role === "librarian" ? "/dashboard/librarian" : "/dashboard/member"
    );
    return null;
  },
  ...
}
```

Without this guard, navigating to `/login` while authenticated showed the login form again rather than redirecting — tests 5 and 9 in auth.spec.ts depended on this UX behavior.

### `frontend/src/pages/books-list/BooksListPage.tsx`

Wired up `onBorrow` and `onDelete` callbacks to `BookCard`. Previously `BookCard` was rendered without these props, so the Borrow button (member view) and Delete button (librarian view) were never rendered — `BookCard` guards both behind the callback being defined.

Added handlers:

```typescript
const handleBorrow = async (book: Book) => {
  await apiClient.post(`/api/v1/books/${book.id}/borrowings`);
  await mutate("/api/v1/borrowings");
  await mutate((key) => typeof key === "string" && key.startsWith("/api/v1/books"));
};

const handleDelete = async (book: Book) => {
  if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
  await bookApi.delete(book.id);
  await mutate((key) => typeof key === "string" && key.startsWith("/api/v1/books"));
};
```

Passed to `BookCard`:

```typescript
<BookCard
  key={book.id}
  book={book}
  onBorrow={isMember ? handleBorrow : undefined}
  onDelete={isLibrarian ? handleDelete : undefined}
/>
```

---

## Bugs Found and Fixed

| # | Location | Bug | Fix |
|---|----------|-----|-----|
| 1 | `backend/db/schema.rb` | `ActiveRecord::Schema[8.1]` — Rails 8.0.5 doesn't recognise schema format 8.1; container crashed on `db:schema:load` | Changed to `ActiveRecord::Schema[8.0]` |
| 2 | `database_cleaner.rb` | `clean_with(:truncation)` in `before(:suite)` wiped seeds before any test ran, causing `RecordNotFound` on all 33 user lookups | Moved E2E seed call to inside `before(:suite)` after truncation |
| 3 | `auth_spec.rb` | `expect(response).to have_http_status(:ok)` on logout — logout returns 204, not 200 | Changed to `:no_content` |
| 4 | Playwright config | 4 browser projects × 44 tests = 176 runs instead of 44 | Replaced 4 projects with single `chromium` project |
| 5 | `router.tsx` | No redirect guard on `/login` — authenticated users could revisit the login form | Added `loader` that redirects to dashboard |
| 6 | `BooksListPage.tsx` | `onBorrow` and `onDelete` never passed to `BookCard` → Borrow and Delete buttons never rendered | Wired up inline handlers |
| 7 | `DashboardPage.ts` | `div.filter().first()` resolved to the outer grid div (containing all 4 stat cards); `.locator("p.text-3xl")` then matched all 4 values — strict mode violation | Replaced with XPath `following-sibling::p[1]` |
| 8 | `auth.spec.ts` | Logout test used the pre-saved `member.json` token; after logout that JTI was blacklisted → all subsequent member tests got 401 | Moved logout test to its own describe block with empty `storageState`; logs in fresh via UI |
| 9 | `LoginPage.ts` | `getErrorText()` read the DOM immediately after form submit, before the API response returned — returned null | Added `waitForSelector('p.text-red-600', { timeout: 5000 })` inside `getErrorText()` |
| 10 | `BooksPage.ts` | `a >> button:text("Edit")` — deprecated `>>` combinator syntax | Changed to chained `.locator('a').locator('button:text("Edit")')` |
| 11 | `BooksPage.ts` | `clickPrevPage` used `waitForResponse` for `/api/v1/books` — SWR serves page 1 from its in-memory cache without a new HTTP request, so the timeout always fires | Replaced with `waitForSelector('text=Page 1 of')` (DOM page indicator) |
| 12 | `borrowings.spec.ts` | Return test clicked the first row in the borrowings table (a seeded borrowing belonging to member1), reducing member1's active count below 2 and breaking the member1 borrowings state tests | Return test now creates a dedicated E2E Book Two borrowing via API and returns only that |

---

## Final Results

### Backend (RSpec E2E)

```
40 examples, 0 failures
```

### Frontend (Playwright)

```
44 tests, 0 failures
```

### Running the full suite

```bash
# Bring up the E2E stack (first time or after code changes)
docker compose -f docker-compose.e2e.yml up -d

# Run everything
./run-e2e

# Frontend only with browser visible
./run-e2e frontend --headed

# Frontend interactive explorer
./run-e2e frontend --ui
```

---

## Dev Credentials

The development stack (`docker-compose.yml`, port 3000 / 5173) uses separate seed data:

| Email | Password | Role |
|-------|----------|------|
| `librarian@library.com` | `password123` | librarian |
| `member1@library.com` | `password123` | member |
| `member2@library.com` | `password123` | member |
| `member3@library.com` | `password123` | member |

E2E credentials (`e2e_*@library.com`) only exist in the E2E test database and are wiped + recreated on every `./run-e2e` invocation.
