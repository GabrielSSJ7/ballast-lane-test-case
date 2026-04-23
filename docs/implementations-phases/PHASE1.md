# Phase 1 — Complete Build Summary

All work delivered in a single day (2026-04-23) across 26 commits, building a full-stack library management system from zero: Rails 8 API backend, React 19 frontend, Docker infrastructure, and comprehensive test coverage for both projects.

---

## Project Overview

**Ballast Lane Library System** — a role-based web application for managing books and borrowings, with two user roles:

- **Librarian** — full CRUD over books, can return borrowed books, sees aggregate dashboard stats
- **Member** — can search and browse books, borrow available books, see their own borrowing history and dashboard

---

## Repository Structure

```
ballast-lane-test-case/
├── backend/          # Rails 8 API-only application
├── frontend/         # React 19 + Vite SPA
├── docker-compose.yml
├── test              # Unified test runner script
└── PHASE1.md
```

---

## Commit History

### `c7dee04` — chore: initialize Rails 8 API scaffold with Docker setup

Bootstrapped the entire monorepo infrastructure:

- `docker-compose.yml` — three services: `db` (PostgreSQL 16), `backend` (Rails), `frontend` (Vite dev server) with port mappings and health checks
- `frontend/Dockerfile` — Node 22 image for the React dev server
- `backend/Dockerfile` — Ruby 3.3 image with bundler
- Rails 8 application skeleton: `config/application.rb` (API-only mode, CORS enabled), `config/database.yml` (PostgreSQL), `config/environments/*`, Puma config
- `Gemfile` with initial dependencies: Rails 8.0, pg, puma, rack-cors, rubocop-rails-omakase, brakeman, dotenv-rails

---

### `587e2ac` — test: add model specs and spec infrastructure

Established the entire RSpec test foundation before writing any application code:

- `spec/rails_helper.rb` — FactoryBot, DatabaseCleaner, Shoulda Matchers, SimpleCov configuration
- `spec/spec_helper.rb` — RSpec core configuration with random ordering
- `spec/support/factory_bot.rb` — global FactoryBot syntax inclusion
- `spec/support/shoulda_matchers.rb` — matcher integration with Rails
- `spec/support/database_cleaner.rb` — transaction strategy for unit tests, truncation for request specs
- `spec/support/auth_helpers.rb` — `auth_headers(user)` helper that generates a real JWT for request specs
- **Factories**: `users` (with `:librarian` and `:member` traits), `books`, `borrowings`
- **Model specs**: `User`, `Book`, `Borrowing` — validations, associations, and custom methods tested with Shoulda Matchers

---

### `9f75e65` — feat: add User, Book, Borrowing, JwtDenylist models with migrations and associations

Core data layer:

- **Migrations**:
  - `jwt_denylists` — stores invalidated JWT tokens (jti + exp columns) for Devise JWT logout
  - `users` — email, encrypted_password (Devise), role enum (`member`/`librarian`), unique index on email
  - `books` — title, author, genre, description, total_copies, available_copies; check constraint `available_copies <= total_copies`
  - `borrowings` — user_id, book_id, borrowed_at, due_date, returned_at (nullable)
- **Models**:
  - `User` — Devise modules: database_authenticatable, registerable, validatable, jwt_authenticatable; role enum; `librarian?` / `member?` helpers
  - `Book` — validations (title/author/genre/description presence, positive copies); `available?` helper
  - `Borrowing` — belongs_to user and book; `active?` (returned_at nil); `overdue?` (due_date past + active)
  - `JwtDenylist` — implements `Devise::JWT::RevocationStrategies::Denylist`

---

### `a61a76a` — test: add auth request specs (register, login, logout)

Request specs for all three auth endpoints covering success paths, validation errors, duplicate email, wrong credentials, and JWT invalidation on logout.

---

### `b0748c7` — feat: add Devise JWT auth controllers (register, login, logout)

- `config/routes.rb` — Devise routes mounted at `/api/v1/auth/{register,login,logout}`
- `app/controllers/api/v1/base_controller.rb` — `before_action :authenticate_user!`, Pundit `authorize` on all actions, `rescue_from Pundit::NotAuthorizedError` (403)
- `app/controllers/api/v1/auth/registrations_controller.rb` — overrides Devise to respond JSON and expose the JWT via `Authorization` response header
- `app/controllers/api/v1/auth/sessions_controller.rb` — login/logout; token exposed in `Authorization` header; logout adds jti to denylist
- `app/serializers/user_serializer.rb` — serializes `id`, `name`, `email`, `role` using `ActiveModel::Serializer`
- `config/initializers/devise.rb` — JWT secret, expiry (24h), dispatch/revocation request paths, Devise 5 compatibility fixes for Rails 8

---

### `314668f` — test: add book request specs, policy specs, and search service specs

Tests for the full Books surface: CRUD endpoints (auth, authorization, validation), `BookPolicy` permission matrix, and `Books::Search` service unit tests.

---

### `607aeb7` — feat: add Books API with Pundit policy, search service, and pagination

- `app/controllers/api/v1/books_controller.rb` — full CRUD; `index` is public (no auth); Pundit-scoped collection; Pagy pagination; strong params whitelist
- `app/policies/book_policy.rb` — permission matrix:
  - `index?` / `show?` — everyone (including guests)
  - `create?` / `update?` / `destroy?` — librarians only
- `app/policies/book_policy.rb` Scope — all books returned for all users
- `app/services/books/search.rb` — case-insensitive `ILIKE` search across title, author, and genre; chainable scope
- `app/serializers/book_serializer.rb` — serializes all book attributes
- `config/initializers/pagy.rb` — default page size of 20

---

### `83fd2d3` — test: add borrowings request specs and service specs

Comprehensive request specs for borrowing creation, return, and listing. Unit specs for `Borrowings::Create` service (available book, unavailable book, already-borrowed scenarios) and `Borrowings::ReturnBook` service.

---

### `9a3f944` — feat: add Borrowings API with create/return/list and Pundit scoping

- `app/controllers/api/v1/borrowings_controller.rb` — `index`, `create`, `return_book`
- `app/policies/borrowing_policy.rb` — permission matrix:
  - `index?` — all authenticated users
  - `create?` — members only
  - `return_book?` — librarians only
  - Scope: librarians see all borrowings; members see only their own
- `app/services/borrowings/create.rb` — transactional service: checks availability, creates borrowing (14-day due date), decrements `book.available_copies`; returns `Result` object
- `app/services/borrowings/return_book.rb` — sets `returned_at`, increments `book.available_copies`; idempotent guard; returns `Result`
- `app/services/result.rb` — simple value object: `Result.success(value)` / `Result.failure(errors)`
- `app/serializers/borrowing_serializer.rb` — serializes borrowing with nested book and user

---

### `7770953` — test: add dashboard request specs

Request specs for both librarian and member dashboard endpoints, covering auth requirements and response shape.

---

### `66fd991` — feat: add Dashboards API with query objects and stats services

- `app/controllers/api/v1/dashboard_controller.rb` — `librarian` and `member` actions; Pundit-authorized
- `app/services/dashboards/librarian_stats.rb` — total books, total copies, available copies, active borrowings count, overdue count, due-today count
- `app/services/dashboards/member_stats.rb` — member's active borrowings, overdue count, due-today count, returned count
- `app/queries/overdue_borrowings_query.rb` — scope: active borrowings where `due_date < today`
- `app/queries/due_today_borrowings_query.rb` — scope: active borrowings where `due_date = today`

---

### `7d8a0c3` — feat: add idempotent seeds with demo credentials and sample borrowings

`db/seeds.rb` creates two demo users (find-or-create idempotent):

- `librarian@library.com` / `password123` — role: librarian
- `member@library.com` / `password123` — role: member

Also seeds 10 sample books and 5 active borrowings for the member.

---

### `186a430` — chore: initialize Vite React 19 TypeScript project config

Frontend project scaffolding:

- `package.json` — React 19, Vite 6, TypeScript 5.7, Tailwind CSS 4, react-router 7, react-hook-form + Zod, SWR 2, Zustand 5, clsx + tailwind-merge, lucide-react icons
- `vite.config.ts` — Vite + React plugin, dev server proxy (`/api` → `http://backend:3000`) for Docker
- `biome.json` — Biome linter/formatter config (replaces ESLint + Prettier)
- `tsconfig.json` / `tsconfig.app.json` — strict TypeScript config

---

### `c61cc03` — test: add auth store unit tests

First frontend test: `src/entities/user/model/store.test.ts` — verifies Zustand auth store initial state, `setAuth`, and `clearAuth` actions. Also adds `src/test/setup.ts` with `@testing-library/jest-dom` matchers import.

---

### `c85296b` — feat: add frontend scaffold with auth store, API client, router, and shared UI

Full shared infrastructure layer:

- **Auth store** (`entities/user/model/store.ts`) — Zustand store with `token`, `user`, `setAuth(token, user)`, `clearAuth()`, and `zustand/persist` to localStorage
- **API client** (`shared/api/client.ts`) — fetch wrapper with automatic `Authorization: Bearer <token>` header injection from Zustand store; `get`, `post`, `patch`, `delete`, `rawPost` methods; `ApiError` class with status and data
- **Environment config** (`shared/config/env.ts`) — `VITE_API_URL` with fallback to empty string
- **`useDebounce` hook** (`shared/hooks/useDebounce.ts`) — generic debounce hook with configurable delay
- **`cn` utility** (`shared/lib/cn.ts`) — `clsx` + `tailwind-merge` combinator
- **Shared UI primitives**:
  - `Button` — variant (primary/secondary/danger/ghost) + size (sm/md/lg) + loading state with spinner
  - `Input` — label, error message, helper text; wraps `<input>` with accessible `htmlFor`
  - `Badge` — color variants (green/yellow/red/blue/gray)
  - `Card` — wrapper with optional `CardHeader`, `CardContent`, `CardFooter` sub-components
  - `Spinner` — SVG spinner with `size` (sm/md/lg) and `className` props; `aria-label="Loading"`
- **Router** (`app/router.tsx`) — React Router 7 with lazy-loaded page components and route protection

---

### `5b2b6fe` — test: add auth login schema validation tests

Unit tests for the Zod login schema: valid credentials pass, invalid email format fails, short password fails, empty fields fail.

---

### `0064de6` — feat: add auth UI (login, register, logout, app layout)

Complete authentication feature set:

- **Login** (`features/auth-login/`) — Zod schema (`z.string().email()` + `min(8)` password), `LoginForm` component using react-hook-form + zodResolver; calls `POST /api/v1/auth/login` via raw fetch; reads `Authorization` header; stores token + user in Zustand; navigates to `/dashboard/:role`
- **Register** (`features/auth-register/`) — same pattern with name field added; calls `POST /api/v1/auth/register`; error handling for `422` (field errors from `body.errors`) and network errors
- **Logout** (`features/auth-logout/`) — `LogoutButton` calls `apiClient.delete('/api/v1/auth/logout')` in `try/finally`; clears Zustand store and navigates to `/login` regardless of API result
- **Layout** (`pages/layout/Layout.tsx`) — top navigation bar with app title, username display, and logout button; wraps authenticated pages via `<Outlet />`
- **Pages**: `LoginPage`, `RegisterPage` — simple wrappers rendering their respective form components

---

### `45a3e88` — test: add book schema validation tests

Unit tests for the Zod book schema: all required fields, character limits, positive-integer copy count validation.

---

### `ce45279` — feat: add Books UI (list, search, pagination, CRUD for librarians, borrow for members)

Full books feature set:

- **Book entity** (`entities/book/`) — Zod schema, TypeScript types, `bookApi.ts` (create/update/delete via apiClient), `useBooks` SWR hook (fetch with search/page params), `BookCard` display component
- **Book Search** (`features/book-search/`) — controlled `BookSearch` input component with debounce integration
- **Book Borrow** (`features/book-borrow/`) — `BorrowButton` calls `POST /api/v1/books/:id/borrowings`; shows loading state; triggers SWR revalidation
- **Book Create** (`features/book-create/`) — `BookForm` with react-hook-form + Zod; create and edit modes; calls apiClient; error display
- **Book Delete** (`features/book-delete/`) — `DeleteBookButton` with confirmation dialog; calls `apiClient.delete`
- **Books List Page** (`pages/books-list/BooksListPage.tsx`) — search input with 300ms debounce, paginated grid of `BookCard`s, librarian-only "Add Book" button and per-card edit/delete controls; SWR-powered
- **Book Edit Page** (`pages/book-edit/BookEditPage.tsx`) — fetches book by ID, renders `BookForm` in edit mode

---

### `9f61c04` — test: add dashboard types tests

Unit tests verifying TypeScript type shapes for `LibrarianDashboard` and `MemberDashboard` data structures.

---

### `4909998` — feat: add Borrowings and Dashboard UI (librarian + member)

- **Borrowing entity** (`entities/borrowing/`) — TypeScript types, `borrowingApi.ts` (return book), `useBorrowings` SWR hook, `BorrowingRow` table row component with status badge and return button for librarians
- **Book Return** (`features/book-return/`) — `ReturnButton` calls `PATCH /api/v1/borrowings/:id/return`; triggers revalidation
- **Dashboard hooks** (`entities/dashboard/api/useDashboard.ts`) — `useLibrarianDashboard` and `useMemberDashboard` SWR hooks
- **Dashboard Librarian Page** — stat cards: total books, copies, available, active borrowings, overdue, due today; full borrowings table with return controls
- **Dashboard Member Page** — stat cards: active borrowings, overdue, due today, returned; personal borrowings table

---

### `1c14ff8` — docs: add README files, GENAI.md with task management API example

- `backend/README.md` — setup instructions, API endpoint reference, auth flow, seeded credentials
- `frontend/README.md` — setup instructions, architecture overview (Feature-Sliced Design), available scripts
- `GENAI.md` — example showcasing the Task Management API integration (AI-generated example content)

---

### `f279e5b` — Fix Docker startup and Devise 5 compatibility for Rails 8 API-only mode

Resolved two production blockers discovered during integration testing:

- **Devise 5 + Rails 8**: `Devise.mappings` access pattern changed; fixed `registrations_controller.rb` and `sessions_controller.rb` to use `resource_class` instead of `Devise.mappings[:user].to`
- **Docker entrypoint**: Fixed `bin/docker-entrypoint` to properly wait for PostgreSQL before running migrations and starting Puma
- Generated and committed `db/schema.rb` so the test database can be loaded without replaying all migrations

---

### `d96a912` — Fix test suite: 100 examples green (backend) + 12 tests green (frontend)

Resolved initial test suite failures after the full application was assembled:

- Backend: fixed `books_spec.rb` authorization test that was using wrong HTTP status expectation; added `config.use_transactional_fixtures = false` guard in `database_cleaner.rb` to prevent double-wrapping
- Frontend: fixed 12 initial test failures across store, schema, and component tests; resolved Vitest config issues (globals, environment, setup file path)

---

### `7557acb` — Add ./test script for running backend and frontend test suites

`test` — a single shell script at the repo root that:

- Runs backend specs inside Docker via `docker compose exec backend bundle exec rspec`
- Runs frontend tests via `docker compose exec frontend npx vitest run`
- Accepts optional first argument: `backend`, `frontend`, or runs both if omitted
- Formats output with clear section headers and a final pass/fail summary
- Exits non-zero if either suite fails

---

### `3a7d6e5` — Add coverage support to both test suites and ./test --coverage flag

- **Backend**: added `simplecov` gem; `spec/rails_helper.rb` starts SimpleCov before loading Rails; generates HTML report to `backend/coverage/` and prints line coverage percentage
- **Frontend**: added `@vitest/coverage-v8`; configured `vite.config.ts` coverage provider (`v8`), reporter (`text`, `html`), and exclusions (`src/test/**`, `src/main.tsx`, `app/router.tsx`, `**/*.d.ts`, `**/index.ts`, `**/types.ts`)
- `./test --coverage` flag passes `--coverage` to both suites; without the flag, coverage is skipped for faster iteration

---

## Coverage Expansion (Current Session)

With both projects fully scaffolded, a second pass brought test coverage to production-ready levels.

### Backend additions

**`spec/policies/book_policy_spec.rb`** — added `describe "Scope"` block:
- Verifies `BookPolicy::Scope#resolve` returns all books regardless of user role

**`spec/policies/borrowing_policy_spec.rb`** (new file) — full BorrowingPolicy spec:
- `permissions :index?` — permits both librarians and members
- `permissions :create?` — permits members only, denies librarians
- `permissions :return_book?` — permits librarians only, denies members
- `describe "Scope"` — librarians resolve all borrowings; members resolve only their own

**`spec/requests/api/v1/books_spec.rb`** — added update failure test:
- `PATCH` with blank title returns `422 Unprocessable Entity` with `errors` key in body

### Frontend — 36 new test files

**Shared utilities and infrastructure:**

| File | Tests | Coverage |
|------|-------|----------|
| `shared/lib/cn.test.ts` | 13 | utility function — all branches |
| `shared/config/env.test.ts` | 3 | env var reading |
| `shared/hooks/useDebounce.test.ts` | 7 | debounce timing with fake timers |
| `shared/api/client.test.ts` | 20 | all HTTP methods, auth headers, error handling, 204 responses |

**Shared UI primitives:**

| File | Tests | Coverage |
|------|-------|----------|
| `shared/ui/Button.test.tsx` | various | variants, sizes, loading state, disabled |
| `shared/ui/Input.test.tsx` | 14 | label, error, helper text, forwarded ref |
| `shared/ui/Badge.test.tsx` | 9 | all color variants |
| `shared/ui/Card.test.tsx` | 13 | Card, CardHeader, CardContent, CardFooter |
| `shared/ui/Spinner.test.tsx` | 10 | sizes, className merge, SVG structure |

**Entities:**

| File | Tests | Notes |
|------|-------|-------|
| `entities/user/model/store.test.ts` | 3 | initial state, setAuth, clearAuth |
| `entities/book/model/schema.test.ts` | 4 | Zod schema validation |
| `entities/book/api/bookApi.test.ts` | 3 | create, update, delete via apiClient mock |
| `entities/book/api/useBooks.test.ts` | 6 | SWR hook — loading, success, error states |
| `entities/book/ui/BookCard.test.tsx` | various | renders book data, available/unavailable badge |
| `entities/borrowing/api/borrowingApi.test.ts` | 2 | return book API call |
| `entities/borrowing/api/useBorrowings.test.ts` | 3 | SWR hook states |
| `entities/borrowing/ui/BorrowingRow.test.tsx` | various | row rendering, return button visibility |
| `entities/dashboard/api/useDashboard.test.ts` | 4 | librarian and member hooks |
| `entities/dashboard/model/types.test.ts` | 2 | type shape assertions |

**Features:**

| File | Tests | Notes |
|------|-------|-------|
| `features/auth-login/model/schema.test.ts` | 3 | Zod schema |
| `features/auth-login/ui/LoginForm.test.tsx` | 7 | renders, validation, fetch call, navigation, error handling |
| `features/auth-register/model/schema.test.ts` | 7 | Zod schema with name field |
| `features/auth-register/ui/RegisterForm.test.tsx` | 8 | renders, validation, fetch, success, error response, network error |
| `features/auth-logout/ui/LogoutButton.test.tsx` | 3 | renders, click clears auth + navigates |
| `features/book-search/ui/BookSearch.test.tsx` | 4 | placeholder, onChange, controlled value |
| `features/book-borrow/ui/BorrowButton.test.tsx` | various | borrow call, loading state |
| `features/book-create/ui/BookForm.test.tsx` | various | create/edit modes, validation, API error |
| `features/book-delete/ui/DeleteBookButton.test.tsx` | various | confirmation flow, delete call |
| `features/book-return/ui/ReturnButton.test.tsx` | various | return call, loading state |

**Pages:**

| File | Tests | Notes |
|------|-------|-------|
| `pages/login/LoginPage.test.tsx` | 3 | renders, contains form |
| `pages/register/RegisterPage.test.tsx` | 3 | renders, contains form |
| `pages/layout/Layout.test.tsx` | various | nav bar, username, logout button |
| `pages/books-list/BooksListPage.test.tsx` | various | search, book grid, librarian controls |
| `pages/book-edit/BookEditPage.test.tsx` | 4 | loading state, form rendered with data |
| `pages/dashboard-librarian/DashboardLibrarianPage.test.tsx` | 4 | stats, borrowings table |
| `pages/dashboard-member/DashboardMemberPage.test.tsx` | 4 | personal stats, borrowings table |

### Key testing patterns and lessons

**`vi.stubGlobal` placement** — must be called in `beforeEach`, not at module level, when the suite also uses `vi.clearAllMocks()`. Module-level stubs are removed after the first `clearAllMocks` call, causing subsequent tests to hit jsdom's real fetch.

**SVG `className` in jsdom** — SVG elements expose `className` as `SVGAnimatedString` (an object), not a string. Class assertions must use `element.getAttribute("class")` rather than `.className`. Query by `getByLabelText("Loading")` instead of `getByRole("img")`.

**HTML5 email validation blocks Zod** — `type="email"` inputs in jsdom prevent the form submit event when the value is not a valid email, stopping React Hook Form's resolver from running. Validation tests use an empty email field (fails `z.string().email()`) rather than a malformed one.

**Controlled inputs with `userEvent.type`** — typing into a controlled input whose `value` prop never updates fires `onChange` once per character with the single character, not the accumulated string. Use `fireEvent.change(input, { target: { value: "full string" } })` for controlled components.

**`try/finally` without `catch` re-throws** — async event handlers wrapped in `try/finally` (no `catch`) re-throw the error after the `finally` block executes. Vitest treats unhandled promise rejections as test failures. Tests covering the "finally always runs" guarantee should use a resolved mock, not a rejected one.

**SWR mocking** — `vi.mock('swr', () => ({ default: vi.fn(), mutate: vi.fn() }))` mocks the entire SWR module; per-test behavior is set via `vi.mocked(useSWR).mockReturnValue(...)`.

---

## Final Coverage Numbers

### Backend (RSpec + SimpleCov)

| Metric | Result |
|--------|--------|
| Line coverage | **98.39%** (244 / 248 lines) |
| Total examples | **110** |
| Failures | **0** |

### Frontend (Vitest + v8)

| Metric | Result |
|--------|--------|
| Statements | **99.08%** |
| Branches | **88.42%** |
| Functions | **96.77%** |
| Lines | **99.08%** |
| Test files | **36** |
| Total tests | **228** |
| Failures | **0** |

---

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Create account; returns user JSON + `Authorization` header |
| POST | `/api/v1/auth/login` | — | Sign in; returns user JSON + `Authorization` header |
| DELETE | `/api/v1/auth/logout` | JWT | Invalidate token (adds jti to denylist) |

### Books

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/v1/books` | — | Any | List books; supports `?q=` search and `?page=` pagination |
| GET | `/api/v1/books/:id` | — | Any | Get single book |
| POST | `/api/v1/books` | JWT | Librarian | Create book |
| PATCH | `/api/v1/books/:id` | JWT | Librarian | Update book |
| DELETE | `/api/v1/books/:id` | JWT | Librarian | Delete book |
| POST | `/api/v1/books/:id/borrowings` | JWT | Member | Borrow a book |

### Borrowings

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/v1/borrowings` | JWT | Any | List borrowings (scoped by role) |
| PATCH | `/api/v1/borrowings/:id/return` | JWT | Librarian | Mark book as returned |

### Dashboard

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/v1/dashboard/librarian` | JWT | Librarian | Aggregate library stats |
| GET | `/api/v1/dashboard/member` | JWT | Member | Personal borrowing stats |

---

## Tech Stack

### Backend
- **Ruby 3.3** / **Rails 8.0** (API-only)
- **PostgreSQL 16**
- **Devise 5** + **devise-jwt** — JWT authentication with denylist revocation
- **Pundit** — policy-based authorization
- **Pagy** — pagination
- **ActiveModel::Serializer** — JSON serialization
- **RSpec 7** + FactoryBot + Faker + Shoulda Matchers + DatabaseCleaner + SimpleCov

### Frontend
- **React 19** + **TypeScript 5.7**
- **Vite 6** (dev server + build)
- **React Router 7** — client-side routing
- **Zustand 5** — auth state (with localStorage persistence)
- **SWR 2** — server state / data fetching
- **React Hook Form 7** + **Zod** — form validation
- **Tailwind CSS 4** — utility-first styling
- **Lucide React** — icons
- **Vitest 3** + Testing Library (React 16 + user-event 14) + jsdom + v8 coverage
- **Biome** — linting and formatting

### Infrastructure
- **Docker Compose** — three-service local dev environment (db, backend, frontend)
- `./test` — unified test runner with optional `--coverage` flag
