# Library Management System

A full-stack library management system built with Rails 8 API and React 19 SPA.

## Quick Start

```bash
docker compose up
```

The app starts at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Librarian | librarian@library.com | password123 |
| Member 1 | member1@library.com | password123 |
| Member 2 | member2@library.com | password123 |
| Member 3 | member3@library.com | password123 |

## Running Tests

### Backend (RSpec)
```bash
# From project root — runs inside Docker
docker compose run --rm api bundle exec rspec

# Or run specific spec
docker compose run --rm api bundle exec rspec spec/requests/api/v1/books_spec.rb
```

### Frontend (Vitest)
```bash
# From project root
docker compose run --rm web npm test

# Or with UI
docker compose run --rm web npm run test:ui
```

## Architecture

### Backend — Clean Architecture

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Controllers | `app/controllers/api/v1/` | HTTP concerns only — params, status codes, rendering |
| Policies | `app/policies/` | All authorization via Pundit |
| Services | `app/services/` | Business logic, return `Result` struct |
| Queries | `app/queries/` | Complex database reads |
| Serializers | `app/serializers/` | PORO response serialization |
| Models | `app/models/` | Validations and simple scopes |

### Frontend — FSD-lite

| Layer | Location | Responsibility |
|-------|----------|----------------|
| `pages/` | Route-level composition | Thin page components |
| `features/` | User actions (verbs) | login, borrow, return, search |
| `entities/` | Domain models (nouns) | book, user, borrowing, dashboard |
| `shared/` | Domain-agnostic | API client, UI components, hooks |

### Key Decisions

- **JWT via devise-jwt** with denylist revocation — tokens are invalidated on logout
- **Pundit policies** for all authorization — no role checks in controllers
- **Service objects** return `Result` struct (`success?`, `value`, `error`) — never raise for business rule violations
- **SWR** for all server state — mutations invalidate relevant cache keys
- **Zustand** only for auth (token + user) — persisted to localStorage
- **Pagy v9** for pagination — 20 books per page

## Project Structure

```
.
├── backend/          # Rails 8 API
├── frontend/         # Vite + React 19 SPA
├── docker-compose.yml
├── README.md
├── GENAI.md          # GenAI exercise with critical evaluation
└── PROMPT.md         # Original requirements
```
