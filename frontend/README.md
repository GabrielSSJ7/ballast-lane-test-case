# Frontend — Vite + React 19 SPA

## Requirements

- Node 22 (via Docker)
- Or Node 22+ locally

## Setup (Docker)

```bash
# From project root
docker compose up web
```

## Local Development

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start dev server (port 5173) |
| `build` | `npm run build` | TypeScript check + Vite build |
| `test` | `npm test` | Run Vitest once |
| `test:watch` | `npm run test:watch` | Watch mode |
| `lint` | `npm run lint` | Biome lint check |
| `format` | `npm run format` | Biome format |

## Testing (Vitest + RTL)

```bash
# From project root (inside Docker)
docker compose run --rm web npm test

# Watch mode
docker compose run --rm web npm run test:watch
```

Tests cover:
- Auth store (Zustand) — setAuth, clearAuth
- Form validation schemas (Zod)
- Dashboard type definitions

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 6 | Build tool + dev server |
| React | 19 | UI framework |
| TypeScript | 5 | Type safety |
| React Router | v7 | Client-side routing + loaders |
| SWR | 2 | Server state + caching |
| Zustand | 5 | Auth state (localStorage) |
| React Hook Form | 7 | Form management |
| Zod | 3 | Schema validation |
| Tailwind | v4 | Utility CSS |
| Biome | 1.9 | Lint + format |

## Structure (FSD-lite)

```
src/
  app/          # Router, styles, main entry
  pages/        # Route-level pages (thin)
  features/     # User actions: auth-login, book-create, book-borrow, book-return
  entities/     # Domain models: book, user, borrowing, dashboard
  shared/       # API client, UI components, hooks, utils
```
