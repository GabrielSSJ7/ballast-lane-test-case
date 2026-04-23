# Library Management System — Full-Stack Technical Exercise

## Goal

Build a library management system covering book CRUD, borrowing workflow, and role-based dashboards. Deliverable is a full-stack app (Rails API + React SPA) running in Docker, evaluated on Clean Architecture, test coverage, code quality, and presentation.

## Evaluation criteria (from the assignment)

- **Clean Architecture**: clear separation of concerns, controllers thin, domain logic isolated from HTTP and persistence
- **Test coverage with TDD**: write failing spec first, then implementation; commit history should reflect red-green-refactor
- **Code quality**: idiomatic Rails 8 and modern React, no Rubocop offenses, no browser console warnings
- **Functionality**: every requirement works end-to-end
- **GenAI section**: separate `GENAI.md` with the prompt used for a task management API exercise, sample output, and critical evaluation

## Out of scope (do not implement)

- Background jobs, Sidekiq, ActiveJob
- Email delivery, mailers
- File/image upload
- Soft deletes, audit logs, versioning
- I18n / translations
- Real-time features (ActionCable)
- Book cover images

## Domain rules

- **Users**: `role` enum of `member` (default) or `librarian`
- **Books**: `title`, `author`, `genre`, `isbn` (unique), `total_copies` (>= 0); `available_copies = total_copies - active_borrowings`
- **Borrowings**: `borrowed_at` (default now), `due_at` (borrowed_at + 2 weeks), `returned_at` (nullable)
- A member can have at most one active borrowing per book
- Only librarians can CRUD books and mark borrowings returned
- Only members can create borrowings (for themselves)

## Acceptance criteria

Each item must be covered by a request spec.

### Auth

- `POST /api/v1/auth/register` → 201 + JWT in `Authorization` header
- `POST /api/v1/auth/login` → 200 + JWT; wrong creds → 401
- `DELETE /api/v1/auth/logout` → 204; token revoked via denylist
- JWT expiration: 24h
- Password minimum: 8 characters

### Books

- `GET /api/v1/books?q=&page=` → 200, paginated (20/page, pagy)
- Search `q` matches `title`, `author`, or `genre` via case-insensitive `ILIKE '%q%'`
- `POST /api/v1/books` → 201 as librarian; 403 as member; 422 if invalid
- `PATCH /api/v1/books/:id` → 200 as librarian; 403 as member
- `DELETE /api/v1/books/:id` → 204 as librarian; 403 as member; 422 if active borrowings exist

### Borrowings

- `POST /api/v1/books/:book_id/borrowings` → 201 as member; 403 as librarian; 422 if unavailable or duplicate
- `PATCH /api/v1/borrowings/:id/return` → 200 as librarian; 403 as member
- `GET /api/v1/borrowings` → librarian sees all; member sees only own

### Dashboards

- `GET /api/v1/dashboard/librarian` → `{ total_books, total_borrowed, due_today, members_with_overdue }`
- `GET /api/v1/dashboard/member` → `{ borrowed_books, overdue_books }`

## Backend — Rails 8 API

**Stack**: Ruby 3.3, Rails 8 (`--api`), PostgreSQL 16

**Gems**: `devise`, `devise-jwt`, `pundit`, `rack-cors`, `pagy`

**Test gems**: `rspec-rails`, `factory_bot_rails`, `faker`, `shoulda-matchers`, `database_cleaner-active_record`

**Dev gems**: `dotenv-rails`, `brakeman`, `rubocop-rails-omakase`

### Architectural rules

- **Controllers**: thin. Only handle HTTP concerns (params, status codes, rendering). No business logic, no role checks.
- **Policies (Pundit)**: all authorization. No `if user.librarian?` outside policies.
- **Service objects** (`app/services/<domain>/<action>.rb`): multi-step use cases. Return a `Result` struct (`success?`, `value`, `error`). Never raise for business rule violations.
- **Query objects** (`app/queries/`): complex reads (overdue, due today). Single `.call` entrypoint.
- **Serializers**: POROs under `app/serializers/`. Controllers call `Serializer.new(record).as_json`.
- **Models**: validations and simple scopes only. No multi-step use cases.

### Folder structure

```
app/
  controllers/
    api/
      v1/
        base_controller.rb        # rescue_from, current_user
        auth/
          registrations_controller.rb
          sessions_controller.rb
        books_controller.rb
        borrowings_controller.rb
        dashboards_controller.rb
  models/
    user.rb
    book.rb
    borrowing.rb
  policies/
    application_policy.rb
    book_policy.rb
    borrowing_policy.rb
  serializers/                    # no gem, plain POROs
    book_serializer.rb
    borrowing_serializer.rb
    user_serializer.rb
  services/                       # business rules
    borrowings/
      create.rb
      return.rb
    books/
      search.rb
    dashboards/
      librarian_stats.rb
      member_stats.rb
  queries/
    overdue_borrowings_query.rb
    due_today_borrowings_query.rb
config/
  routes.rb
spec/
  models/
  requests/                       # integration HTTP (prefer over controller specs)
  services/
  policies/
  factories/
  support/
    auth_helpers.rb               # login_as(user)
    shoulda_matchers.rb
```

### Error response format

- `{ "error": "message" }` for single errors
- `{ "errors": { field: ["msg"] } }` for validation errors

### Exception handling

- `ActiveRecord::RecordNotFound` → 404
- `ActiveRecord::RecordInvalid` → 422
- `Pundit::NotAuthorizedError` → 403
- Unauthenticated → 401

## Frontend — Vite + React 19 SPA

**Stack**: Vite 6, React 19, TypeScript, React Router v7 (data mode via `createBrowserRouter`), SWR, Zustand (auth only — token + current user), React Hook Form + Zod, Tailwind v4, shadcn/ui, Lucide icons

**Test stack**: Vitest + React Testing Library — unit-test form validation and one or two critical flows, not every component

**Tooling**: Biome for lint/format, Husky pre-commit running `biome check` + `vitest run --changed`

### Folder structure (FSD-lite)

```
src/
  app/                    # application setup
    providers/            # router, theme, auth provider
    router.tsx
    main.tsx
    styles/globals.css

  pages/                  # composition — each route is a "thin page"
    login/
    register/
    books-list/
    book-edit/
    dashboard-librarian/
    dashboard-member/

  features/               # user actions (verbs)
    auth-login/
    auth-register/
    auth-logout/
    book-create/
    book-edit/
    book-delete/
    book-borrow/
    book-return/
    book-search/

  entities/               # domain models (nouns)
    book/
      model/              # types, zod schemas, store if needed
      api/                # SWR hooks, fetchers
      ui/                 # BookCard, BookRow — "dumb" domain components
      index.ts            # public API (barrel)
    user/
    borrowing/

  shared/                 # domain-agnostic code
    api/                  # fetch wrapper, interceptors
    ui/                   # shadcn components, Button, Input
    lib/                  # utils, cn, formatters
    config/               # env, constants
    hooks/                # useDebounce, useMediaQuery
```

### Rules

- SWR for all server state; invalidate via `mutate(key)` after mutations
- Zustand only for auth (token, current user). Persist to localStorage.
- All API calls go through `shared/api/client.ts` (fetch wrapper with auth header + error normalization)
- React Router loaders for route-level auth guards (redirect to `/login` if no token)
- Forms: `zodResolver` + shared schemas between `features/` and `entities/`
- No inline styles; Tailwind utilities only
- Responsive: mobile-first, breakpoint at `md:` for desktop layout
- No console warnings at runtime

## Docker setup

### Requirements

- Root `docker-compose.yml` orchestrates `db` (Postgres 16), `api` (Rails), `web` (Vite dev server)
- `Dockerfile` per app (backend, frontend), both optimized for development with hot reload
- Named volumes for `bundle` and `node_modules` (don't bind-mount them)
- Bind-mount source code for hot reload
- `docker compose up` from root starts everything
- Rails waits for Postgres to be healthy before starting
- Frontend connects to API via `VITE_API_URL=http://localhost:3000`

## Deliverables

Repository should contain:

- **`README.md`** at root: project overview, one-command setup (`docker compose up`), demo credentials, architecture decisions, how to run tests
- **`backend/README.md`**: Ruby version, gem overview, testing commands
- **`frontend/README.md`**: Node version, scripts, testing commands
- **`GENAI.md`** at root: required by the assignment. Include (a) the exact prompt used to generate a Task Management API, (b) sample of generated code, (c) critical evaluation covering validation, corrections, edge cases, and idiomatic quality
- **`db/seeds.rb`**: 1 librarian, 3 members, 15 books, some borrowings including at least one overdue and one due today
- **Demo credentials** clearly documented: `librarian@library.com` / `password123` and `member1@library.com` / `password123`
- **Clean git history** with conventional commits reflecting TDD workflow

## Process

- Backend first, feature by feature, TDD throughout: failing request spec → implementation → refactor
- Commit after each green test with messages like `test:`, `feat:`, `refactor:`
- After backend is complete and all specs pass, build the frontend
