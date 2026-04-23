# Backend — Rails 8 API

## Requirements

- Ruby 3.3
- PostgreSQL 16
- Docker (recommended for running)

## Setup (Docker)

```bash
# From project root
docker compose up api db
```

## Running Tests

```bash
# All specs
docker compose run --rm api bundle exec rspec

# With format
docker compose run --rm api bundle exec rspec --format documentation

# Specific file
docker compose run --rm api bundle exec rspec spec/requests/api/v1/books_spec.rb

# Single test
docker compose run --rm api bundle exec rspec spec/requests/api/v1/auth/sessions_spec.rb -e "returns 401"
```

## Gems Overview

| Gem | Purpose |
|-----|---------|
| `devise` + `devise-jwt` | Authentication + JWT generation/revocation |
| `pundit` | Authorization policies |
| `pagy` | Pagination (20 items/page) |
| `rack-cors` | CORS headers with JWT exposure |
| `rspec-rails` | Test framework |
| `factory_bot_rails` | Test factories |
| `faker` | Fake data in factories/seeds |
| `shoulda-matchers` | One-liner model matchers |
| `database_cleaner-active_record` | DB cleanup between tests |
| `rubocop-rails-omakase` | Linting |
| `brakeman` | Security analysis |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | Public | Register + JWT |
| POST | /api/v1/auth/login | Public | Login + JWT |
| DELETE | /api/v1/auth/logout | JWT | Logout + revoke |
| GET | /api/v1/books | JWT | List + search |
| POST | /api/v1/books | Librarian | Create book |
| PATCH | /api/v1/books/:id | Librarian | Update book |
| DELETE | /api/v1/books/:id | Librarian | Delete book |
| POST | /api/v1/books/:book_id/borrowings | Member | Borrow |
| PATCH | /api/v1/borrowings/:id/return | Librarian | Return |
| GET | /api/v1/borrowings | JWT | List borrowings |
| GET | /api/v1/dashboard/librarian | Librarian | Library stats |
| GET | /api/v1/dashboard/member | Member | Personal stats |

## Static Analysis

```bash
# Security scan
docker compose run --rm api bundle exec brakeman

# Linting
docker compose run --rm api bundle exec rubocop
```
