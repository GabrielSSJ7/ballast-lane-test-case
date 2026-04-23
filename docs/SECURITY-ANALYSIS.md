# Security Audit Report — Library Management System

**Date:** 2026-04-23
**Stack:** Rails 8 API + React 19 SPA
**Deployment context:** AWS EC2 + Docker + Nginx, Route 53, separate EC2 cluster for PostgreSQL 16
**Scale:** 10,000 users, ~500 requests/day

---

## Executive Summary

Overall risk posture: **HIGH**. Three production-blocking issues form a "lethal triad" for API authentication:

1. **JWT stored in localStorage** — any XSS gives an attacker persistent token theft with no mitigation
2. **No rate limiting on auth endpoints** — fully open to brute-force and credential stuffing
3. **`force_ssl = false` in production** — credentials and JWTs transmit in plaintext over HTTP

The application has no obvious catastrophic logic bugs and the backend Pundit authorization layer is correctly implemented. However, the combination of cleartext transport + localStorage tokens + no rate limiting is sufficient to compromise any account on the system.

---

## Findings

### CRITICAL

---

#### C-1: JWT Token Stored in localStorage — XSS Pivot to Full Account Takeover

**OWASP:** A07:2021 – Identification and Authentication Failures / A03:2021 – Injection

**File:** `frontend/src/entities/user/model/store.ts`

```ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ token: null, user: null, ... }),
    { name: "auth" }   // persists to localStorage under key "auth"
  )
);
```

The JWT (24-hour lifetime) is serialized into `localStorage` via Zustand's `persist` middleware. `localStorage` is accessible to any JavaScript running in the page's origin, including injected scripts from compromised npm dependencies. Because the token is injected into every API call via `buildHeaders()` in `client.ts`, any XSS — even transient — immediately yields a token that can be exfiltrated and replayed from any machine for up to 24 hours.

**Attack scenario:**
1. Attacker injects a malicious script via a compromised npm dependency or any future XSS surface.
2. Script reads `JSON.parse(localStorage.getItem("auth")).state.token`.
3. Attacker replays token from their own machine to impersonate the victim for up to 24 hours.
4. If victim is a librarian, attacker can delete books, approve returns, or enumerate all borrowing records.

**Fix:** Migrate token storage to an `httpOnly; Secure; SameSite=Strict` cookie. Configure `devise-jwt` to use its cookie dispatch strategy, or implement a Backend-for-Frontend (BFF) that sets the cookie server-side. The frontend store should only hold non-sensitive user metadata (id, name, role). As an interim measure, reduce `jwt.expiration_time` to 15 minutes and implement silent refresh.

---

#### C-2: No Rate Limiting on Authentication Endpoints — Open Brute-Force

**OWASP:** A07:2021 – Identification and Authentication Failures

**File:** `backend/Gemfile` (absence of `rack-attack`), `backend/app/models/user.rb` (no `:lockable` module)

`POST /api/v1/auth/login` and `POST /api/v1/auth/register` have zero throttling. Devise's `:lockable` module is not enabled. bcrypt at 12 stretches (~200ms each) allows ~432,000 attempts per day per attacker thread against 10,000 accounts.

**Attack scenario:**
1. Attacker harvests confirmed emails from the registration endpoint (see H-1).
2. Runs a tool like `hydra` or `ffuf` with common password lists.
3. No lockout, no CAPTCHA, no 429 — attack is limited only by bcrypt compute time.

**Fix:**

```ruby
# Gemfile
gem "rack-attack"
```

```ruby
# config/initializers/rack_attack.rb
Rack::Attack.throttle("logins/ip", limit: 5, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/login" && req.post?
end

Rack::Attack.throttle("logins/email", limit: 10, period: 300) do |req|
  if req.path == "/api/v1/auth/login" && req.post?
    req.params.dig("user", "email")&.downcase
  end
end

Rack::Attack.throttle("registrations/ip", limit: 3, period: 300) do |req|
  req.ip if req.path == "/api/v1/auth/register" && req.post?
end
```

Add `config.middleware.use Rack::Attack` in `application.rb`. Also enable `:lockable` in the Devise modules on `User`.

---

#### C-3: `force_ssl = false` in Production — JWTs and Credentials Transmitted in Plaintext

**OWASP:** A02:2021 – Cryptographic Failures

**File:** `backend/config/environments/production.rb`

```ruby
config.force_ssl = false
```

The Rails app will serve HTTP. `Authorization: Bearer <jwt>` is sent on every API call via `client.ts`. Any network observer on the path between EC2 and the client captures tokens in plaintext.

**Attack scenario:**
1. On a public Wi-Fi network, attacker runs Wireshark or `mitmproxy`.
2. Victim makes any authenticated API call over HTTP.
3. Attacker captures the `Authorization: Bearer eyJhb...` header and replays it for up to 24 hours.

**Fix:**

```ruby
# config/environments/production.rb
config.force_ssl = true   # enables HSTS + HTTP→HTTPS redirect
```

Configure Nginx with TLS termination and add:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

### HIGH

---

#### H-1: Account Enumeration via Registration Error Responses

**OWASP:** A07:2021 – Identification and Authentication Failures

**File:** `backend/app/controllers/api/v1/auth/registrations_controller.rb`

```ruby
render json: { errors: resource.errors }, status: :unprocessable_entity
```

A duplicate email returns `{ errors: { email: ["has already been taken"] } }` — confirming the address exists in the system. An attacker can submit a list of emails to build a confirmed-registered set for targeted credential stuffing.

**Fix:** Return a generic response that does not reveal whether the email is taken:

```ruby
render json: { error: "Registration failed. Please check your details." }, status: :unprocessable_entity
```

Never expose `resource.errors` field-level details publicly from the registration endpoint.

---

#### H-2: Secrets Hardcoded in Docker Compose Files Committed to Version Control

**OWASP:** A02:2021 – Cryptographic Failures / A05:2021 – Security Misconfiguration

**Files:** `docker-compose.yml`, `docker-compose.e2e.yml`

```yaml
SECRET_KEY_BASE: dev_secret_key_base_replace_in_production_abcdefg12345678901234567890
DATABASE_URL: postgresql://postgres:password@db/library_development
```

`SECRET_KEY_BASE` is the JWT signing key (used by `devise.rb`). Anyone with repository read access can forge valid JWTs for any user, including librarians, without credentials. The database password `password` is in every dictionary.

**Attack scenario:**
1. Attacker reads `SECRET_KEY_BASE` from git history.
2. Crafts a JWT `{ "sub": 1, "role": "librarian" }` signed with the known secret.
3. Makes authenticated requests as any user with no credentials.

**Fix:**
- Remove all secrets from compose files. Use a `.env` file (gitignored) locally.
- In production: inject `SECRET_KEY_BASE` and `DATABASE_URL` via AWS Secrets Manager or SSM Parameter Store.
- **Rotate `SECRET_KEY_BASE` immediately** — it is already in git history. Rotation invalidates all current JWTs; plan a maintenance window.
- Seed accounts should use `SecureRandom.hex(16)` passwords printed once to stdout, not hardcoded strings.

---

#### H-3: JWT Denylist Has No Expiry Cleanup — Unbounded Table Growth

**OWASP:** A06:2021 – Vulnerable and Outdated Components (design gap)

**File:** `backend/app/models/jwt_denylist.rb`

Every logout adds a row to `jwt_denylists`. Devise JWT's denylist strategy does not auto-purge expired entries. The `jti` index also lacks `unique: true`, allowing duplicate entries to accumulate. Over time, the `WHERE jti = ?` lookup executed on every authenticated request degrades as the table grows unboundedly. Under a logout-spam attack (login → logout in a loop), this degrades authentication for all users.

**Fix:**

```ruby
# lib/tasks/jwt_cleanup.rake
namespace :jwt do
  task cleanup: :environment do
    deleted = JwtDenylist.where("exp < ?", Time.current).delete_all
    puts "Deleted #{deleted} expired JWT denylist entries."
  end
end
```

Add a migration for the unique index:

```ruby
add_index :jwt_denylists, :jti, unique: true
```

Schedule the rake task to run daily via cron or a background job scheduler.

---

#### H-4: Race Condition in `Borrowings::Create` — Negative Available Copies

**OWASP:** A04:2021 – Insecure Design

**File:** `backend/app/services/borrowings/create.rb`

The availability check and `borrowing.save` are not wrapped in a pessimistic lock. Two simultaneous requests for the last available copy both pass the `available_copies <= 0` guard before either commits, resulting in `available_copies = -1`.

**Attack scenario:** Two authenticated members send `POST /api/v1/books/42/borrowings` simultaneously. Both read `available_copies = 1`, both pass the check, both save. `available_copies` becomes `-1`.

**Fix:**

```ruby
def call
  ActiveRecord::Base.transaction do
    book = Book.lock.find(@book.id)  # SELECT FOR UPDATE — holds row lock
    return Result.failure("Book is not available") if book.available_copies <= 0
    return Result.failure("Already have an active borrowing") if duplicate_borrowing?
    borrowing = book.borrowings.build(user: @user)
    borrowing.save!
    Result.success(borrowing)
  end
rescue ActiveRecord::RecordInvalid => e
  Result.failure(e.message)
end
```

---

### MEDIUM

---

#### M-1: Registration Endpoint Open to Automated Account Creation

**OWASP:** A07:2021 – Identification and Authentication Failures

**File:** `backend/config/routes.rb`, `frontend/src/app/router.tsx`

Registration has no CAPTCHA, no email verification, and no rate limit. An attacker can register thousands of accounts programmatically to exhaust available book copies or build a credential list for other services.

Additionally, the `/register` route in the React SPA has no redirect-if-authenticated loader (unlike `/login` at `router.tsx` line 27, which already redirects authenticated users via a loader).

**Fix:**
- Enable Devise `:confirmable` module to require email verification.
- Add rack-attack throttle for registration (covered by the C-2 fix).
- Add a redirect-if-authenticated loader to the `/register` route, mirroring the `/login` pattern.

---

#### M-2: CORS Configuration — Overly Permissive Headers and Unsafe Default

**OWASP:** A05:2021 – Security Misconfiguration

**File:** `backend/config/initializers/cors.rb`

```ruby
origins ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
resource "*",
  headers: :any,
  methods: [:get, :post, :put, :patch, :delete, :options, :head],
  expose: ["Authorization"]
```

Issues:
- `headers: :any` accepts all request headers without restriction.
- `:put` is included but no Rails route uses PUT — unnecessary attack surface.
- The fallback to `http://localhost:5173` means CORS silently breaks in production if `ALLOWED_ORIGINS` is not set.

**Fix:**

```ruby
origins ENV.fetch("ALLOWED_ORIGINS").split(",")   # no fallback — fail fast if not configured

resource "*",
  headers: %w[Authorization Content-Type Accept],
  methods: [:get, :post, :patch, :delete, :options, :head],
  expose: ["Authorization"],
  credentials: false
```

Validate at startup that all configured origins use `https://`.

---

#### M-3: Client-Side Role Gating — `user.role` Read from Spoofable localStorage

**OWASP:** A01:2021 – Broken Access Control

**File:** `frontend/src/app/router.tsx` lines 10–22

```ts
function requireLibrarian() {
  const { token, user } = useAuthStore.getState();
  if (!token) return redirect("/login");
  if (user?.role !== "librarian") return redirect("/dashboard/member");
  return null;
}
```

`user.role` is read from Zustand, which is sourced from `localStorage`. A user can write `localStorage` directly to set `role: "librarian"` and bypass the frontend route guard, rendering librarian UI (Edit/Delete/Add buttons). **Backend Pundit authorization correctly blocks the actual API calls, so no data modification is possible.** However, this is a trust boundary confusion and a future risk if new features add frontend-only guards.

**Fix:** On app load, re-validate the user object by calling `GET /api/v1/users/me` and refreshing the Zustand store. Do not rely solely on the persisted localStorage value for authorization decisions.

---

#### M-4: `BorrowingSerializer` Exposes Integer `user_id` — Enables User Enumeration

**OWASP:** A01:2021 – Broken Access Control / A03:2021 – Sensitive Data Exposure

**File:** `backend/app/serializers/borrowing_serializer.rb`

`user_id` as an auto-increment integer leaks the internal database sequence and total user count, enabling IDOR probing and user enumeration. The `BorrowingPolicy::Scope` correctly scopes member responses to their own records, but the field still exposes the ID.

**Fix:** Omit `user_id` from member-facing responses, or return it only in librarian-scoped serialization. Long-term: switch primary keys to UUIDs to prevent sequential ID probing across all resources.

---

#### M-5: No `verify_authorized` / `verify_policy_scoped` Safety Net in BaseController

**OWASP:** A01:2021 – Broken Access Control

**File:** `backend/app/controllers/api/v1/base_controller.rb`

Pundit's `after_action :verify_authorized` and `after_action :verify_policy_scoped` are not configured. A developer adding a new action who forgets to call `authorize` will silently serve data with no access control — no test or runtime check will catch the omission. `DashboardController` already uses an inline role check instead of the standard Pundit `authorize` call, increasing this risk.

**Fix:**

```ruby
# app/controllers/api/v1/base_controller.rb
after_action :verify_authorized, except: :index
after_action :verify_policy_scoped, only: :index
```

Refactor `DashboardController` to use proper Pundit policy objects (create `DashboardPolicy`) rather than inline role checks.

---

### LOW

---

#### L-1: No Security Headers on API or Frontend Responses

**OWASP:** A05:2021 – Security Misconfiguration

No Nginx configuration was found in the repository. The application sends no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers.

**Fix:** Add to the Nginx config (covers both API and frontend):

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';" always;
```

---

#### L-2: Docker Containers Run as Root — No `USER` Directive

**OWASP:** A05:2021 – Security Misconfiguration

**Files:** `backend/Dockerfile`, `frontend/Dockerfile`

Neither Dockerfile specifies a non-root user. If a Rails RCE is exploited, the attacker has root inside the container and a much easier path to host escape or database pivot.

**Fix:** Add to both Dockerfiles before the `EXPOSE` instruction:

```dockerfile
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app /usr/local/bundle
USER appuser
```

---

#### L-3: Database Port Not Published — But Production Network Segmentation Must Be Verified

**OWASP:** A05:2021 – Security Misconfiguration

**File:** `docker-compose.yml`

The `db` service has no `ports:` entry, which is correct. However, on the actual EC2 deployment with a separate PostgreSQL cluster: the PostgreSQL EC2 security group must allow inbound 5432 **only** from the API EC2 security group ID — not from `0.0.0.0/0`. The API container binds on `0.0.0.0:3000`; ensure the API EC2 security group blocks port 3000 from the internet and only allows 80/443.

---

#### L-4: N+1 Queries in Book List — `available_copies` Computed Per-Row

**OWASP:** A04:2021 – Insecure Design (performance/availability)

**File:** `backend/app/serializers/book_serializer.rb`

```ruby
def available_copies
  total_copies - borrowings.active.count  # one COUNT query per book
end
```

With 20 books per page, every `GET /api/v1/books` executes 20 extra `COUNT` queries. Under sustained load this multiplies database query count proportionally.

**Fix:** Use a subquery or counter cache:

```ruby
scope :with_available_copies, -> {
  left_joins(:borrowings)
    .where(borrowings: { returned_at: nil })
    .select("books.*, (books.total_copies - COUNT(borrowings.id)) AS computed_available")
    .group("books.id")
}
```

---

#### L-5: Seed File Creates Librarian Account with Password `password123`

**OWASP:** A07:2021 – Identification and Authentication Failures

**File:** `backend/db/seeds.rb`

```ruby
User.find_or_create_by!(email: "librarian@library.com") do |u|
  u.password = "password123"
```

The entrypoint runs `rails db:seed` unless `RAILS_ENV == "test"`. In production, a librarian account with a dictionary password exists by default.

**Fix:**

```ruby
pass = SecureRandom.hex(16)
puts "  Librarian password (save this): #{pass}"
u.password = pass
```

Or skip seeding entirely in production and manage accounts through a secured admin flow.

---

#### L-6: `backend/Gemfile.lock` Gitignored — Non-Reproducible Builds

**OWASP:** A06:2021 – Vulnerable and Outdated Components

**File:** `.gitignore`

Without a committed `Gemfile.lock`, each Docker build resolves gem versions fresh. A patch-level gem update can silently introduce a CVE without any code change.

**Fix:** Remove `backend/Gemfile.lock` from `.gitignore` and commit it. This is standard Rails practice and essential for reproducible production builds.

---

### Informational

| # | Note |
|---|------|
| I-1 | **SQL injection in `Book.search`** — correctly uses `sanitize_sql_like` + parameterized queries. Not vulnerable. |
| I-2 | **`books` index is public** — intentional per spec. `BookPolicy#index?` correctly returns `true` for guests. |
| I-3 | **`dotenv-rails` in dev/test only** — correct pattern. Production env vars must be injected by the deployment system. |
| I-4 | **JWT denylist uses `jti` claim** — correct revocation strategy. Logout correctly invalidates a specific token. |
| I-5 | **`GET /up` health check is unauthenticated** — standard Rails practice. Confirm Nginx does not expose this publicly if internal-only health checks are desired. |

---

## Infrastructure Recommendations

### Nginx (no config found in repo — must be created for production)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self';" always;

    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {
        root      /app/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker Hardening

Add to all production compose services:

```yaml
security_opt: [no-new-privileges:true]
cap_drop: [ALL]
read_only: true
tmpfs: [/tmp]
```

Remove `stdin_open: true` and `tty: true` from production — these are development conveniences. Remove `volumes: ./backend:/app` bind mounts from production compose; the image should use `COPY` only.

### AWS Network Segmentation

- **PostgreSQL SG:** inbound 5432 from API EC2 security group ID only — never `0.0.0.0/0`
- **API EC2 SG:** inbound 80/443 from internet (or ALB); port 3000 from Nginx/localhost only
- Consider placing the API behind an AWS Application Load Balancer with AWS WAF rules for rate limiting at the infrastructure layer — this complements `rack-attack` and cannot be bypassed if the origin IP is blocked upstream

### Secrets Management

- Move `SECRET_KEY_BASE` and `DATABASE_URL` to AWS Secrets Manager or SSM Parameter Store (SecureString)
- Inject at runtime via EC2 user data, ECS task definition, or a secrets manager sidecar — never via a Docker Compose `environment:` block committed to version control
- **Rotate `SECRET_KEY_BASE` immediately** — it is already in git history. Plan a maintenance window: all existing JWTs are invalidated on rotation
- Enable AWS CloudTrail for audit logging on all Secrets Manager access

---

## Quick Wins — Prioritized

Each fix takes under one hour and is actionable immediately.

| Priority | Fix | Estimated Time | Eliminates |
|----------|-----|---------------|-----------|
| 1 | Set `config.force_ssl = true` in `production.rb` | 2 min | C-3 — plaintext transport |
| 2 | Remove secrets from `docker-compose.yml`, load from `.env` (gitignored) | 10 min | H-2 — hardcoded signing key |
| 3 | Add `gem "rack-attack"` + throttle initializer | 20 min | C-2 — brute-force |
| 4 | Add `Book.lock.find` in `Borrowings::Create` | 15 min | H-4 — race condition |
| 5 | Genericize registration error response | 10 min | H-1 — email enumeration |
| 6 | Add unique index + cleanup Rake task for `jwt_denylists` | 15 min | H-3 — denylist growth |
| 7 | Add `USER appuser` to both Dockerfiles | 10 min | L-2 — root containers |
| 8 | Add `after_action :verify_authorized` to `BaseController` | 5 min | M-5 — authorization safety net |
| 9 | Commit `Gemfile.lock` (remove from `.gitignore`) | 5 min | L-6 — reproducible builds |

**Long-term sprint:** Migrate JWT storage from `localStorage` to `httpOnly` cookies (C-1). This is the highest long-term impact fix but requires the most engineering effort. Track as a dedicated ticket separate from the quick wins above.
