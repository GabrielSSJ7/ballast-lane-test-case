# Phase 4 — Security Hardening

All work delivered on 2026-04-23 as a production-grade security pass on top of the Phase 1–3 application. The phase began with a full threat-model analysis (`docs/SECURITY-ANALYSIS.md`) then implemented every finding considered worth fixing for the target deployment (EC2 + Docker + Nginx + Route 53, 10 k users, ~500 req/day), while keeping dev, RSpec, and Playwright E2E suites at 100 % green.

---

## Goals

- Eliminate the highest-risk credential exposure vectors (JWT in localStorage, weak CORS, missing session validation)
- Add a rate-limiting layer to protect auth endpoints from credential-stuffing
- Harden authorization so missing `authorize` calls are detected at the framework level
- Fix two concurrency / data-integrity gaps (race condition in borrow, non-unique JTI denylist)
- Remove a data-leakage vector (user IDs exposed to members)
- Eliminate the N+1 query on the books list endpoint
- Lock Gemfile.lock into version control

---

## Security Findings and Severity Map

The full analysis is in `docs/SECURITY-ANALYSIS.md`. Items implemented in this phase:

| ID  | Severity | Finding | Status |
|-----|----------|---------|--------|
| C-1 | Critical | JWT stored in `localStorage` — readable by any JS on the page | Fixed |
| C-2 | Critical | No rate limiting on auth endpoints | Fixed |
| H-1 | High | Registration errors expose whether an email already exists | Fixed |
| H-3 | High | JWT denylist JTI column lacks a unique index; no expiry cleanup | Fixed |
| H-4 | High | `Borrowings::Create` has a TOCTOU race on `available_copies` | Fixed |
| M-2 | Medium | CORS allows any origin or lacks credential support | Fixed |
| M-3 | Medium | No server-side session validation on page load | Fixed |
| M-4 | Medium | `user_id` included in member-facing borrowing responses | Fixed |
| M-5 | Medium | No safety net for controllers that forget to call `authorize` | Fixed |
| L-4 | Low | N+1 query on `GET /api/v1/books` (one SQL per book for `available_copies`) | Fixed |
| L-6 | Low | `Gemfile.lock` excluded from version control | Fixed |

---

## Implementation Details

### C-1 — JWT out of `localStorage` → httpOnly cookie

**Problem:** `localStorage` is accessible to any JavaScript executing on the page. An XSS vulnerability in any dependency would allow an attacker to exfiltrate the JWT and impersonate the user indefinitely.

**Backend — `AuthCookieMiddleware`** (`backend/app/middleware/auth_cookie_middleware.rb`)

A new Rack middleware inserted at position 0 (outermost) acts as a two-way bridge:

- **On request:** if `HTTP_AUTHORIZATION` is absent, it reads the `auth_token` cookie from the request and injects `"Bearer <token>"` into the Rack env before the request reaches Warden.
- **On response:** if the response contains an `Authorization` header (set by `warden-jwt_auth`'s `TokenDispatcher`), it copies the JWT into a `Set-Cookie` header with `HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` attributes. The `Secure` flag is set dynamically based on the presence of `HTTPS` or `X-Forwarded-Proto: https` env vars.
- **On logout (`DELETE /auth/logout`):** sets `Max-Age=0` to expire the cookie immediately.

```ruby
# config/application.rb
require_relative "../app/middleware/auth_cookie_middleware"
config.middleware.insert_before 0, AuthCookieMiddleware
```

**Rack 3 compatibility note:** Rack 3 normalises response header keys to lowercase internally. The middleware checks both `headers["Authorization"]` and `headers["authorization"]` to remain compatible with any middleware ordering. The `Set-Cookie` key is written using whichever casing is already in the hash.

**Frontend — Zustand `partialize`** (`frontend/src/entities/user/model/store.ts`)

Added `setUser` action and changed `persist`'s `partialize` option so only `user` is written to `localStorage`; `token` lives in memory only:

```typescript
partialize: (state) => ({ user: state.user }),
```

On page refresh, `user` is hydrated from `localStorage` (route guards stay satisfied) while `token` is null; subsequent API calls authenticate via the httpOnly cookie automatically.

**Frontend — `credentials: "include"`** (`frontend/src/shared/api/client.ts`, `LoginForm.tsx`, `RegisterForm.tsx`)

All `fetch` calls now include `credentials: "include"` so the browser sends the httpOnly cookie on every cross-origin request to the API.

**Frontend — route guards** (`frontend/src/app/router.tsx`)

All `requireAuth` / `requireRole` guards now read `user` (persisted) instead of `token` (memory-only):

```typescript
function requireAuth() {
  const user = useAuthStore.getState().user;
  if (!user) return redirect("/login");
  return null;
}
```

**Frontend — `/me` validation on mount** (`frontend/src/pages/layout/Layout.tsx`)

`Layout` calls `GET /api/v1/users/me` on mount. If the server returns 401 (expired or revoked cookie), `clearAuth()` is called and the user is redirected to `/login`:

```typescript
useEffect(() => {
  apiClient.get<User>("/api/v1/users/me")
    .then((freshUser) => setUser(freshUser))
    .catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        clearAuth();
        navigate("/login");
      }
    });
}, []);
```

**E2E global setup** (`e2e/frontend/global-setup.ts`)

Playwright `storageState` files now include an `auth_token` cookie entry (`domain: "localhost"`, `httpOnly: true`, `sameSite: "Lax"`) alongside the `localStorage` entry. The JWT is kept in `localStorage` solely so that `readToken()` in `borrowings.spec.ts` can make direct API calls; the running app ignores it.

---

### C-2 — Rate limiting with Rack::Attack

**New file:** `backend/config/initializers/rack_attack.rb`

Three throttles are configured:

| Throttle | Limit | Window | Key |
|----------|-------|--------|-----|
| `logins/ip` | 5 | 60 s | `POST /api/v1/auth/login` by IP |
| `logins/email` | 10 | 300 s | `POST /api/v1/auth/login` by email body param |
| `registrations/ip` | 3 | 300 s | `POST /api/v1/auth/register` by IP |

Rack::Attack is loaded via its Rails Railtie (auto-inserted into the middleware stack) plus an explicit `config.middleware.use Rack::Attack` in `application.rb`.

---

### H-1 — Generic registration error response

**Problem:** A failed registration returned the full `user.errors` hash (e.g. `{"email":["has already been taken"]}`), allowing enumeration of registered emails.

**Fix** (`backend/app/controllers/api/v1/auth/registrations_controller.rb`):

```ruby
render json: { error: "Registration failed. Please check your details." },
       status: :unprocessable_entity
```

**Frontend** (`frontend/src/features/auth-register/ui/RegisterForm.tsx`):

The form now reads `body.error` first, then falls back to individual field errors from `body.errors`, then a generic string:

```typescript
const errorMsg =
  body.error ??
  body.errors?.email?.[0] ??
  body.errors?.password?.[0] ??
  "Registration failed. Please try again.";
```

---

### H-3 — JWT denylist unique index + cleanup task

**Migration:** `backend/db/migrate/20240101000005_add_unique_index_to_jwt_denylists_jti.rb`

Drops the existing non-unique index on `jti` and creates a unique one, preventing duplicate revocations.

**Rake task:** `backend/lib/tasks/jwt_cleanup.rake`

```ruby
task cleanup: :environment do
  deleted = JwtDenylist.where("exp < ?", Time.current).delete_all
  puts "Deleted #{deleted} expired JWT denylist entries."
end
```

The task is safe to run on a cron schedule (e.g. nightly) and was wired into the RSpec suite via a dedicated spec that confirms it removes only expired entries.

---

### H-4 — Pessimistic lock in `Borrowings::Create`

**Problem:** Two concurrent requests could both read `available_copies > 0` and both succeed, issuing one more borrowing than physically available.

**Fix** (`backend/app/services/borrowings/create.rb`):

```ruby
def call
  ActiveRecord::Base.transaction do
    book = Book.lock.find(@book.id)   # SELECT FOR UPDATE
    return failure("Book is not available") if book.available_copies <= 0
    return failure("You already have an active borrowing for this book") if duplicate_borrowing?
    borrowing = book.borrowings.build(user: @user)
    borrowing.save ? success(borrowing) : failure(borrowing.errors.full_messages.join(", "))
  end
end
```

`Book.lock.find(id)` issues `SELECT ... FOR UPDATE`, serialising concurrent borrow attempts at the database level.

---

### M-2 — CORS fix

**Problem:** `origins "*"` with `credentials: true` is rejected by all browsers. Development needed to work across multiple ports (Vite dev: 5173, Vite preview: 4173, test runners: 3000).

**Fix** (`backend/config/initializers/cors.rb`):

```ruby
allowed_origins = if Rails.env.production?
  ENV.fetch("ALLOWED_ORIGINS").split(",")
else
  ENV.fetch("ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:5174,http://localhost:3001"
  ).split(",")
end

origins allowed_origins
resource "*",
  headers: %w[Authorization Content-Type Accept],
  methods: [:get, :post, :patch, :delete, :options, :head],
  expose: ["Authorization"],
  credentials: true
```

The E2E Docker Compose passes `ALLOWED_ORIGINS=http://localhost:5174,...` for its specific port mapping.

---

### M-3 — `/me` endpoint

**New controller:** `backend/app/controllers/api/v1/users_controller.rb`

```ruby
class Api::V1::UsersController < Api::V1::BaseController
  def me
    authorize current_user, :me?
    render json: UserSerializer.new(current_user).as_json
  end
end
```

**New policy:** `backend/app/policies/user_policy.rb`

```ruby
class UserPolicy < ApplicationPolicy
  def me? = true   # any authenticated user may fetch their own profile
end
```

**Route:** `GET /api/v1/users/me` added inside the `namespace :v1` block.

The client-side session validation (calling this endpoint on Layout mount) is described under C-1.

---

### M-4 — Remove `user_id` from member borrowing responses

**Problem:** Members could see the internal `user_id` of other users' borrowings through the API response.

**Fix** (`backend/app/serializers/borrowing_serializer.rb`):

`BorrowingSerializer` now accepts a `current_user:` keyword argument and conditionally includes `user_id` only for librarians:

```ruby
def as_json
  result = { id:, book_id:, book:, borrowed_at:, due_at:, returned_at:, overdue: }
  result[:user_id] = @borrowing.user_id if @current_user&.librarian?
  result
end
```

All three call sites in `BorrowingsController` pass `current_user: current_user`.

---

### M-5 — `verify_authorized` safety net in `BaseController`

**Problem:** Controllers that forgot to call `authorize` would silently bypass Pundit.

**Fix** (`backend/app/controllers/api/v1/base_controller.rb`):

```ruby
after_action :verify_authorized, unless: :skip_pundit_verify?

def skip_pundit_verify?
  current_user.nil? || @_pundit_skipped
end
```

Every rescue handler (`render_forbidden`, `render_not_found`, `render_unprocessable`) sets `@_pundit_skipped = true` before rendering, because these handlers fire before `authorize` is called (e.g. from a `before_action :set_book` that raises `RecordNotFound`).

`DashboardController` was also migrated from inline `raise Pundit::NotAuthorizedError` to proper Pundit `authorize :dashboard, :librarian?` / `:member?` calls, with a new `DashboardPolicy`.

---

### L-4 — Fix N+1 on book list

**Problem:** `GET /api/v1/books` issued one `COUNT` SQL query per book to compute `available_copies`.

**Fix — controller** (`backend/app/controllers/api/v1/books_controller.rb`):

```ruby
books = result.value[:books]
ActiveRecord::Associations::Preloader
  .new(records: books.to_a, associations: :borrowings)
  .call
```

`ActiveRecord::Associations::Preloader` is used (instead of eager loading on the scope) because Pagy already ran the paginated query; preloading after the fact avoids a second `COUNT(*)` for pagination.

**Fix — model** (`backend/app/models/book.rb`):

```ruby
def available_copies
  if borrowings.loaded?
    total_copies - borrowings.count { |b| b.returned_at.nil? }
  else
    total_copies - borrowings.active.count
  end
end
```

`borrowings.loaded?` branches to an in-memory count when the association is preloaded, and falls back to SQL otherwise (e.g. for a single-book `show` endpoint).

---

### L-6 — Commit `Gemfile.lock`

Removed `backend/Gemfile.lock` from `.gitignore`. Locking dependencies ensures deterministic installs across CI and production environments.

---

## Files Changed / Created

### Backend

| Path | Change |
|------|--------|
| `app/middleware/auth_cookie_middleware.rb` | New — httpOnly cookie bridge |
| `app/controllers/api/v1/base_controller.rb` | `verify_authorized` safety net |
| `app/controllers/api/v1/users_controller.rb` | New — `/me` endpoint |
| `app/controllers/api/v1/dashboard_controller.rb` | Pundit `authorize` calls |
| `app/controllers/api/v1/borrowings_controller.rb` | Pass `current_user:` to serializer |
| `app/controllers/api/v1/auth/registrations_controller.rb` | Generic error response |
| `app/models/book.rb` | `borrowings.loaded?` branch in `available_copies` |
| `app/policies/dashboard_policy.rb` | New |
| `app/policies/user_policy.rb` | New — `me?` policy |
| `app/serializers/borrowing_serializer.rb` | Conditional `user_id` |
| `app/services/borrowings/create.rb` | Pessimistic lock |
| `config/application.rb` | Register `AuthCookieMiddleware`, `Rack::Attack` |
| `config/initializers/cors.rb` | Environment-based allowed origins, `credentials: true` |
| `config/initializers/rack_attack.rb` | New — throttle rules |
| `config/routes.rb` | `GET /api/v1/users/me` |
| `db/migrate/20240101000005_add_unique_index_to_jwt_denylists_jti.rb` | New |
| `db/schema.rb` | Unique index on `jti` |
| `lib/tasks/jwt_cleanup.rake` | New — expire old denylist rows |
| `.gitignore` | Remove `backend/Gemfile.lock` |
| `spec/e2e/auth_spec.rb` | Update duplicate-email assertion (`errors` → `error`) |
| `spec/requests/api/v1/borrowings_spec.rb` | `user_id` visibility assertions |
| `spec/requests/api/v1/books_spec.rb` | Fix available-copies test: search by title to avoid pagination boundary |
| `spec/requests/api/v1/users_spec.rb` | New |
| `spec/services/borrowings/create_spec.rb` | Pessimistic lock coverage |
| `spec/policies/dashboard_policy_spec.rb` | New |
| `spec/policies/user_policy_spec.rb` | New |
| `spec/tasks/jwt_cleanup_spec.rb` | New |
| `spec/support/database_cleaner.rb` | Seed isolation: per-e2e-context loading, explicit pre-clean for non-e2e tests |

### Frontend

| Path | Change |
|------|--------|
| `src/entities/user/model/store.ts` | `setUser` action, `partialize` to persist only `user` |
| `src/shared/api/client.ts` | `credentials: "include"` on all requests |
| `src/app/router.tsx` | Guards read `user` instead of `token` |
| `src/pages/layout/Layout.tsx` | `/me` validation `useEffect` |
| `src/pages/layout/Layout.test.tsx` | Mock `apiClient.get`; scope link queries with `within(header)` |
| `src/features/auth-register/ui/RegisterForm.tsx` | Generic error fallback chain |
| `src/features/auth-register/ui/RegisterForm.test.tsx` | Updated error assertion |
| `src/features/auth-login/ui/LoginForm.tsx` | `credentials: "include"` |

### E2E

| Path | Change |
|------|--------|
| `e2e/frontend/global-setup.ts` | Cookie entry in `storageState` (`auth_token`, `httpOnly`, `SameSite: Lax`) |

---

## Test Suite Fixes

Several existing tests needed updating to stay accurate after the security changes:

**Skeleton screen assertions (5 test files)**
Phase 3 replaced all `<Spinner>` usages with skeleton screens. Tests that checked for `.flex.justify-center` (the old spinner container) or `getByLabelText("Loading")` (the old spinner's aria-label) were updated to check for `.animate-pulse` (the `Skeleton` component's class).

**Layout duplicate-link ambiguity**
`BottomNav` (Phase 3) added a second "Books" and "Dashboard" link. Tests that called `screen.getByRole("link", { name: "Books" })` started throwing "Found multiple elements". Fixed by importing `within` from `@testing-library/react` and scoping the query to the `<header>` element.

**Database cleaner seed isolation**
The introduction of `spec/e2e/` caused `DatabaseCleaner`'s `before(:suite)` to load seed data unconditionally. Seed books (25 rows with low IDs) would persist into non-e2e model/service/request specs, pushing test-created records to page 2 and breaking pagination assertions.

Resolution:
1. Seeds are now loaded in `before(:context, :e2e)` (once per e2e spec file) rather than `before(:suite)`.
2. Non-e2e tests use the `:truncation` strategy.
3. An explicit `DatabaseCleaner.clean` call was added *before* each non-e2e example — `DatabaseCleaner.cleaning { }` only cleans *after* the block, so preceding e2e commits would otherwise still be visible to the first non-e2e test in any given random order.

---

## Key Design Decisions

**`AuthCookieMiddleware` at position 0**

The middleware must be outermost because `warden-jwt_auth`'s `TokenDispatcher` is deep in the stack and sets the `Authorization` response header on the way *out*. Only a middleware that wraps the entire stack can intercept that header and copy it into a `Set-Cookie`.

Rack::Cors ends up at position 0 (inserted by its initializer after `AuthCookieMiddleware` is inserted by `application.rb`), so the final order is: Rack::Cors → AuthCookieMiddleware → … → Warden → Rails app.

**`SameSite=Lax` for local dev and E2E**

`localhost:5174` (frontend) and `localhost:3001` (API) are same-site (same eTLD+1 = `localhost`), so `SameSite=Lax` cookies are sent by the browser on cross-origin requests with `credentials: include`. `SameSite=Strict` would also work here but `Lax` is the safer default for future deployment scenarios.

**`partialize` keeps only `user` in `localStorage`**

The token was previously written to `localStorage` as part of the Zustand `auth` slice. With `partialize`, Zustand writes only `{ user }`. The token lives in memory for the duration of the session and is refreshed from the httpOnly cookie on every request. The E2E `storageState` files still include the token in the `localStorage` JSON for backward compatibility with `readToken()` in `borrowings.spec.ts`, but the running app ignores it.

**`verify_authorized` + `@_pundit_skipped`**

Pundit's `after_action :verify_authorized` raises if no `authorize` call was made during the action. Rescue handlers (`render_forbidden`, `render_not_found`, `render_unprocessable`) fire in `before_action` callbacks before any controller action code runs, so `authorize` is never called in those paths. The `@_pundit_skipped` instance-variable flag tells `skip_pundit_verify?` to stand down, avoiding false `AuthorizationNotPerformedError` exceptions.
