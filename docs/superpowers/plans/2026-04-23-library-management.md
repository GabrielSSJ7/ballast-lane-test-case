# Library Management System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack library management system with Rails 8 API backend and React 19 SPA frontend running in Docker.

**Architecture:** Clean Architecture — thin controllers, Pundit policies for authorization, service objects for business logic, query objects for complex reads, PORO serializers. Frontend uses FSD-lite with SWR for server state and Zustand for auth only.

**Tech Stack:** Ruby 3.3 / Rails 8 API / PostgreSQL 16 / Devise + devise-jwt / Pundit / Pagy | Vite 6 / React 19 / TypeScript / React Router v7 / SWR / Zustand / Tailwind v4 / shadcn/ui / Biome

**Root:** `/home/gluz/code/ballast-lane-test-case/`

---

## KEY PATTERNS (read before any task)

### Service Result struct
```ruby
# app/services/result.rb
Result = Struct.new(:success?, :value, :error, keyword_init: true)
```

### PORO Serializer
```ruby
class BookSerializer
  def initialize(book, pagy: nil)
    @book = book
    @pagy = pagy
  end
  def as_json = { id: @book.id, title: @book.title, ... }
end
```

### Request Spec helper
```ruby
# spec/support/auth_helpers.rb
module AuthHelpers
  def auth_headers(user)
    post '/api/v1/auth/login', params: { user: { email: user.email, password: user.password } }
    { 'Authorization' => response.headers['Authorization'] }
  end
end
```

### Pundit policy authorization in controller
```ruby
authorize @book  # raises Pundit::NotAuthorizedError → 403 via rescue_from
```

---

## Task B1: Docker + Rails 8 API Scaffold

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/.ruby-version`
- Create: `backend/Gemfile`
- Create: `backend/Rakefile`
- Create: `backend/config/boot.rb`
- Create: `backend/config/application.rb`
- Create: `backend/config/environment.rb`
- Create: `backend/config/environments/development.rb`
- Create: `backend/config/environments/test.rb`
- Create: `backend/config/environments/production.rb`
- Create: `backend/config/database.yml`
- Create: `backend/config/routes.rb`
- Create: `backend/config/puma.rb`
- Create: `backend/config/initializers/cors.rb`
- Create: `backend/config/initializers/devise.rb` (skeleton — filled in B3)
- Create: `backend/config/initializers/pagy.rb`
- Create: `backend/app/controllers/application_controller.rb`
- Create: `backend/.rubocop.yml`
- Create: `backend/bin/docker-entrypoint`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: library_development
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    entrypoint: /app/bin/docker-entrypoint
    command: bundle exec rails s -b 0.0.0.0 -p 3000
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:password@db/library_development
      RAILS_ENV: development
      SECRET_KEY_BASE: dev_secret_key_base_replace_in_production_abcdefg12345678901234567890
      ALLOWED_ORIGINS: "http://localhost:5173,http://localhost:3001"
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - bundle_cache:/usr/local/bundle
    stdin_open: true
    tty: true

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    depends_on:
      - api
    environment:
      VITE_API_URL: http://localhost:3000
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - node_modules:/app/node_modules

volumes:
  pg_data:
  bundle_cache:
  node_modules:
```

- [ ] **Step 2: Create `backend/bin/docker-entrypoint`**

```bash
#!/usr/bin/env bash
set -e

bundle check || bundle install

bundle exec rails db:prepare
bundle exec rails db:seed

exec "$@"
```

Make it executable: `chmod +x backend/bin/docker-entrypoint`

- [ ] **Step 3: Create `backend/Dockerfile`**

```dockerfile
FROM ruby:3.3-slim

RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    postgresql-client \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN gem install bundler -v 2.5.18

COPY Gemfile ./
RUN bundle install

EXPOSE 3000
```

- [ ] **Step 4: Create `frontend/Dockerfile`**

```dockerfile
FROM node:22-slim

WORKDIR /app

COPY package.json ./

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 5: Create `backend/.ruby-version`**

```
3.3.0
```

- [ ] **Step 6: Create `backend/Gemfile`**

```ruby
source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby "3.3.0"

gem "rails", "~> 8.0"
gem "pg", "~> 1.5"
gem "puma", "~> 6.4"
gem "rack-cors"
gem "devise"
gem "devise-jwt"
gem "pundit"
gem "pagy", "~> 9.0"

group :development, :test do
  gem "dotenv-rails"
  gem "debug", platforms: %i[mri windows]
  gem "rubocop-rails-omakase", require: false
  gem "brakeman", require: false
end

group :test do
  gem "rspec-rails", "~> 7.0"
  gem "factory_bot_rails"
  gem "faker"
  gem "shoulda-matchers", "~> 6.0"
  gem "database_cleaner-active_record"
end
```

- [ ] **Step 7: Create `backend/Rakefile`**

```ruby
require_relative "config/application"
Rails.application.load_tasks
```

- [ ] **Step 8: Create `backend/config/boot.rb`**

```ruby
ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)
require "bundler/setup"
require "bootsnap/setup" if File.exist?("#{__dir__}/../vendor/bundle/ruby/*/gems/bootsnap-*/lib/bootsnap/setup.rb")
```

Actually, no bootsnap for simplicity. Use:
```ruby
ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)
require "bundler/setup"
```

- [ ] **Step 9: Create `backend/config/application.rb`**

```ruby
require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_mailbox/engine"
require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module LibraryApi
  class Application < Rails::Application
    config.load_defaults 8.0

    config.api_only = true

    config.middleware.use ActionDispatch::Flash
    config.middleware.use ActionDispatch::Session::CookieStore
  end
end
```

- [ ] **Step 10: Create `backend/config/environment.rb`**

```ruby
require_relative "application"
Rails.application.initialize!
```

- [ ] **Step 11: Create `backend/config/environments/development.rb`**

```ruby
require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true
  config.server_timing = true
  config.cache_store = :null_store
  config.active_support.deprecation = :log
  config.active_record.migration_error = :page_load
  config.active_record.verbose_query_logs = true
  config.action_mailer.raise_delivery_errors = false
end
```

- [ ] **Step 12: Create `backend/config/environments/test.rb`**

```ruby
require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = false
  config.cache_store = :null_store
  config.action_dispatch.show_exceptions = :none
  config.action_controller.raise_on_unpermitted_parameters = true
  config.active_support.deprecation = :stderr
  config.active_record.verbose_query_logs = false
end
```

- [ ] **Step 13: Create `backend/config/environments/production.rb`**

```ruby
require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.force_ssl = false
  config.log_level = :info
  config.cache_store = :null_store
end
```

- [ ] **Step 14: Create `backend/config/database.yml`**

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  url: <%= ENV["DATABASE_URL"] %>

development:
  <<: *default

test:
  <<: *default
  url: <%= ENV.fetch("DATABASE_URL", "postgresql://postgres:password@db/library_test") %>

production:
  <<: *default
```

- [ ] **Step 15: Create `backend/config/routes.rb`** (skeleton, will be filled in task B3)

```ruby
Rails.application.routes.draw do
  devise_for :users,
    path: "api/v1/auth",
    path_names: {
      sign_in: "login",
      sign_out: "logout",
      registration: "register"
    },
    controllers: {
      sessions: "api/v1/auth/sessions",
      registrations: "api/v1/auth/registrations"
    }

  namespace :api do
    namespace :v1 do
      resources :books do
        resources :borrowings, only: [:create]
      end
      resources :borrowings, only: [:index] do
        member do
          patch :return
        end
      end
      namespace :dashboard do
        get :librarian
        get :member
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
```

- [ ] **Step 16: Create `backend/config/puma.rb`**

```ruby
max_threads_count = ENV.fetch("RAILS_MAX_THREADS", 5)
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

worker_timeout 3600 if ENV.fetch("RAILS_ENV", "development") == "development"

port ENV.fetch("PORT", 3000)

environment ENV.fetch("RAILS_ENV", "development")

pidfile ENV["PIDFILE"] if ENV["PIDFILE"]
```

- [ ] **Step 17: Create `backend/config/initializers/cors.rb`**

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization"]
  end
end
```

- [ ] **Step 18: Create `backend/config/initializers/pagy.rb`**

```ruby
require "pagy/extras/headers"
require "pagy/extras/metadata"

Pagy::DEFAULT[:limit] = 20
```

- [ ] **Step 19: Create `backend/config/initializers/devise.rb`** (skeleton)

```ruby
Devise.setup do |config|
  config.mailer_sender = "noreply@library.example.com"
  config.orm = :active_record
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]
  config.skip_session_storage = [:http_auth, :token_auth]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = false
  config.expire_all_remember_me_on_sign_out = true
  config.password_length = 8..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.sign_out_via = :delete
  config.responder.error_status = :unprocessable_entity
  config.responder.redirect_status = :found

  config.jwt do |jwt|
    jwt.secret = ENV.fetch("SECRET_KEY_BASE")
    jwt.dispatch_requests = [
      ["POST", %r{^/api/v1/auth/login$}],
      ["POST", %r{^/api/v1/auth/register$}]
    ]
    jwt.revocation_requests = [
      ["DELETE", %r{^/api/v1/auth/logout$}]
    ]
    jwt.expiration_time = 24.hours.to_i
  end
end
```

- [ ] **Step 20: Create `backend/app/controllers/application_controller.rb`**

```ruby
class ApplicationController < ActionController::API
end
```

- [ ] **Step 21: Create `backend/.rubocop.yml`**

```yaml
inherit_gem:
  rubocop-rails-omakase: rubocop.yml

AllCops:
  NewCops: enable
  Exclude:
    - "db/schema.rb"
    - "bin/**/*"
    - "config/**/*"
    - "Gemfile"
```

- [ ] **Step 22: Commit**

```bash
git add .
git commit -m "chore: initialize Rails 8 API scaffold with Docker setup"
```

---

## Task B2: Models + Migrations + Spec Setup

**Files:**
- Create: `backend/db/migrate/TIMESTAMP_create_jwt_denylists.rb`
- Create: `backend/db/migrate/TIMESTAMP_create_users.rb`
- Create: `backend/db/migrate/TIMESTAMP_create_books.rb`
- Create: `backend/db/migrate/TIMESTAMP_create_borrowings.rb`
- Create: `backend/app/models/jwt_denylist.rb`
- Create: `backend/app/models/user.rb`
- Create: `backend/app/models/book.rb`
- Create: `backend/app/models/borrowing.rb`
- Create: `backend/app/models/application_record.rb`
- Create: `backend/spec/rails_helper.rb`
- Create: `backend/spec/spec_helper.rb`
- Create: `backend/spec/support/auth_helpers.rb`
- Create: `backend/spec/support/database_cleaner.rb`
- Create: `backend/spec/support/factory_bot.rb`
- Create: `backend/spec/support/shoulda_matchers.rb`
- Create: `backend/spec/factories/users.rb`
- Create: `backend/spec/factories/books.rb`
- Create: `backend/spec/factories/borrowings.rb`
- Create: `backend/spec/models/user_spec.rb`
- Create: `backend/spec/models/book_spec.rb`
- Create: `backend/spec/models/borrowing_spec.rb`

**Migration timestamps use format YYYYMMDDHHMMSS. Use sequential fake timestamps:**
- 20240101000001_create_jwt_denylists
- 20240101000002_create_users
- 20240101000003_create_books
- 20240101000004_create_borrowings

- [ ] **Step 1: Write failing model specs**

```ruby
# spec/models/user_spec.rb
require "rails_helper"

RSpec.describe User, type: :model do
  describe "validations" do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_length_of(:password).is_at_least(8) }
  end

  describe "enums" do
    it { should define_enum_for(:role).with_values(member: 0, librarian: 1) }
  end

  describe "defaults" do
    it "defaults to member role" do
      expect(build(:user).role).to eq("member")
    end
  end
end
```

```ruby
# spec/models/book_spec.rb
require "rails_helper"

RSpec.describe Book, type: :model do
  describe "validations" do
    it { should validate_presence_of(:title) }
    it { should validate_presence_of(:author) }
    it { should validate_presence_of(:genre) }
    it { should validate_presence_of(:isbn) }
    it { should validate_uniqueness_of(:isbn) }
    it { should validate_numericality_of(:total_copies).is_greater_than_or_equal_to(0) }
  end

  describe "associations" do
    it { should have_many(:borrowings).dependent(:destroy) }
  end

  describe "#available_copies" do
    it "returns total_copies minus active borrowings count" do
      book = create(:book, total_copies: 3)
      create(:borrowing, book: book)
      create(:borrowing, book: book, returned_at: Time.current)
      expect(book.available_copies).to eq(2)
    end
  end

  describe ".search" do
    let!(:ruby_book) { create(:book, title: "Ruby on Rails") }
    let!(:python_book) { create(:book, title: "Python Guide", author: "Alice") }

    it "finds by title" do
      expect(Book.search("ruby")).to include(ruby_book)
    end

    it "finds by author" do
      expect(Book.search("alice")).to include(python_book)
    end

    it "is case-insensitive" do
      expect(Book.search("RUBY")).to include(ruby_book)
    end
  end
end
```

```ruby
# spec/models/borrowing_spec.rb
require "rails_helper"

RSpec.describe Borrowing, type: :model do
  describe "associations" do
    it { should belong_to(:user) }
    it { should belong_to(:book) }
  end

  describe "validations" do
    it { should validate_presence_of(:borrowed_at) }
    it { should validate_presence_of(:due_at) }
  end

  describe "defaults" do
    it "sets borrowed_at on create" do
      borrowing = create(:borrowing)
      expect(borrowing.borrowed_at).to be_present
    end

    it "sets due_at to 2 weeks after borrowed_at" do
      borrowing = create(:borrowing)
      expect(borrowing.due_at).to be_within(1.second).of(borrowing.borrowed_at + 2.weeks)
    end
  end

  describe "scopes" do
    it ".active returns borrowings without returned_at" do
      active = create(:borrowing)
      returned = create(:borrowing, returned_at: Time.current)
      expect(Borrowing.active).to include(active)
      expect(Borrowing.active).not_to include(returned)
    end

    it ".overdue returns active borrowings past due_at" do
      overdue = create(:borrowing, due_at: 1.day.ago)
      not_due = create(:borrowing, due_at: 1.day.from_now)
      expect(Borrowing.overdue).to include(overdue)
      expect(Borrowing.overdue).not_to include(not_due)
    end
  end
end
```

- [ ] **Step 2: Create migrations**

```ruby
# db/migrate/20240101000001_create_jwt_denylists.rb
class CreateJwtDenylists < ActiveRecord::Migration[8.0]
  def change
    create_table :jwt_denylists do |t|
      t.string :jti, null: false
      t.datetime :exp, null: false
      t.timestamps
    end
    add_index :jwt_denylists, :jti
  end
end
```

```ruby
# db/migrate/20240101000002_create_users.rb
class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string :name
      t.string :email, null: false, default: ""
      t.string :encrypted_password, null: false, default: ""
      t.integer :role, default: 0, null: false
      t.timestamps
    end
    add_index :users, :email, unique: true
  end
end
```

```ruby
# db/migrate/20240101000003_create_books.rb
class CreateBooks < ActiveRecord::Migration[8.0]
  def change
    create_table :books do |t|
      t.string :title, null: false
      t.string :author, null: false
      t.string :genre, null: false
      t.string :isbn, null: false
      t.integer :total_copies, null: false, default: 1
      t.timestamps
    end
    add_index :books, :isbn, unique: true
  end
end
```

```ruby
# db/migrate/20240101000004_create_borrowings.rb
class CreateBorrowings < ActiveRecord::Migration[8.0]
  def change
    create_table :borrowings do |t|
      t.references :user, null: false, foreign_key: true
      t.references :book, null: false, foreign_key: true
      t.datetime :borrowed_at, null: false
      t.datetime :due_at, null: false
      t.datetime :returned_at
      t.timestamps
    end
  end
end
```

- [ ] **Step 3: Create models**

```ruby
# app/models/application_record.rb
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
```

```ruby
# app/models/jwt_denylist.rb
class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist
  self.table_name = "jwt_denylists"
end
```

```ruby
# app/models/user.rb
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  enum :role, { member: 0, librarian: 1 }, default: :member

  has_many :borrowings, dependent: :destroy

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :password, length: { minimum: 8 }, allow_nil: true

  def librarian? = role == "librarian"
  def member? = role == "member"
end
```

```ruby
# app/models/book.rb
class Book < ApplicationRecord
  has_many :borrowings, dependent: :destroy

  validates :title, :author, :genre, presence: true
  validates :isbn, presence: true, uniqueness: true
  validates :total_copies, numericality: { greater_than_or_equal_to: 0 }

  scope :search, ->(query) {
    where("title ILIKE :q OR author ILIKE :q OR genre ILIKE :q", q: "%#{sanitize_sql_like(query)}%")
  }

  def available_copies
    total_copies - borrowings.active.count
  end
end
```

```ruby
# app/models/borrowing.rb
class Borrowing < ApplicationRecord
  belongs_to :user
  belongs_to :book

  validates :borrowed_at, :due_at, presence: true

  scope :active, -> { where(returned_at: nil) }
  scope :overdue, -> { active.where("due_at < ?", Time.current) }
  scope :due_today, -> { active.where(due_at: Date.current.all_day) }

  before_validation :set_dates, on: :create

  private

  def set_dates
    self.borrowed_at ||= Time.current
    self.due_at ||= borrowed_at + 2.weeks
  end
end
```

- [ ] **Step 4: Create spec support files**

```ruby
# spec/rails_helper.rb
require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rspec/rails"
require "database_cleaner/active_record"

Dir[Rails.root.join("spec/support/**/*.rb")].sort.each { |f| require f }

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.fixture_paths = ["#{::Rails.root}/spec/fixtures"]
  config.use_transactional_fixtures = false
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
  config.include FactoryBot::Syntax::Methods
  config.include AuthHelpers, type: :request
end
```

```ruby
# spec/spec_helper.rb
RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end
  config.shared_context_metadata_behavior = :apply_to_host_groups
end
```

```ruby
# spec/support/database_cleaner.rb
RSpec.configure do |config|
  config.before(:suite) do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.clean_with(:truncation)
  end

  config.around(:each) do |example|
    DatabaseCleaner.cleaning { example.run }
  end
end
```

```ruby
# spec/support/factory_bot.rb
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
```

```ruby
# spec/support/shoulda_matchers.rb
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
```

```ruby
# spec/support/auth_helpers.rb
module AuthHelpers
  def auth_headers(user)
    post "/api/v1/auth/login",
      params: { user: { email: user.email, password: "password123" } },
      as: :json
    { "Authorization" => response.headers["Authorization"] }
  end
end
```

- [ ] **Step 5: Create factories**

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { Faker::Name.full_name }
    email { Faker::Internet.unique.email }
    password { "password123" }
    role { :member }

    trait :librarian do
      role { :librarian }
    end

    trait :member do
      role { :member }
    end
  end
end
```

```ruby
# spec/factories/books.rb
FactoryBot.define do
  factory :book do
    title { Faker::Book.title }
    author { Faker::Book.author }
    genre { Faker::Book.genre }
    isbn { Faker::Code.unique.isbn }
    total_copies { 3 }
  end
end
```

```ruby
# spec/factories/borrowings.rb
FactoryBot.define do
  factory :borrowing do
    association :user
    association :book
    borrowed_at { Time.current }
    due_at { 2.weeks.from_now }
    returned_at { nil }

    trait :returned do
      returned_at { Time.current }
    end

    trait :overdue do
      borrowed_at { 3.weeks.ago }
      due_at { 1.week.ago }
    end

    trait :due_today do
      borrowed_at { 2.weeks.ago }
      due_at { Date.current.end_of_day }
    end
  end
end
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: add model specs and factories"
git add .
git commit -m "feat: add User, Book, Borrowing, JwtDenylist models with migrations"
```

---

## Task B3: Auth API (TDD)

**Files:**
- Create: `backend/app/controllers/api/v1/base_controller.rb`
- Create: `backend/app/controllers/api/v1/auth/registrations_controller.rb`
- Create: `backend/app/controllers/api/v1/auth/sessions_controller.rb`
- Create: `backend/app/serializers/user_serializer.rb`
- Create: `backend/spec/requests/api/v1/auth/registrations_spec.rb`
- Create: `backend/spec/requests/api/v1/auth/sessions_spec.rb`

- [ ] **Step 1: Write failing request specs**

```ruby
# spec/requests/api/v1/auth/registrations_spec.rb
require "rails_helper"

RSpec.describe "POST /api/v1/auth/register", type: :request do
  let(:valid_params) do
    {
      user: {
        name: "Alice",
        email: "alice@example.com",
        password: "password123"
      }
    }
  end

  context "with valid params" do
    it "returns 201 and JWT in Authorization header" do
      post "/api/v1/auth/register", params: valid_params, as: :json
      expect(response).to have_http_status(:created)
      expect(response.headers["Authorization"]).to be_present
      expect(response.headers["Authorization"]).to start_with("Bearer ")
    end

    it "returns user data in body" do
      post "/api/v1/auth/register", params: valid_params, as: :json
      body = JSON.parse(response.body)
      expect(body["email"]).to eq("alice@example.com")
      expect(body["role"]).to eq("member")
    end
  end

  context "with invalid params" do
    it "returns 422 when password is too short" do
      post "/api/v1/auth/register",
        params: { user: { email: "a@a.com", password: "short" } },
        as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when email is taken" do
      create(:user, email: "alice@example.com")
      post "/api/v1/auth/register", params: valid_params, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
```

```ruby
# spec/requests/api/v1/auth/sessions_spec.rb
require "rails_helper"

RSpec.describe "Auth Sessions", type: :request do
  let(:user) { create(:user, email: "user@example.com", password: "password123") }

  describe "POST /api/v1/auth/login" do
    it "returns 200 and JWT on valid credentials" do
      post "/api/v1/auth/login",
        params: { user: { email: user.email, password: "password123" } },
        as: :json
      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to start_with("Bearer ")
    end

    it "returns 401 on wrong password" do
      post "/api/v1/auth/login",
        params: { user: { email: user.email, password: "wrongpass" } },
        as: :json
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE /api/v1/auth/logout" do
    it "returns 204 and revokes the token" do
      headers = auth_headers(user)
      delete "/api/v1/auth/logout", headers: headers
      expect(response).to have_http_status(:no_content)

      # Token should now be denied
      get "/api/v1/books", headers: headers
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
```

- [ ] **Step 2: Create UserSerializer**

```ruby
# app/serializers/user_serializer.rb
class UserSerializer
  def initialize(user)
    @user = user
  end

  def as_json
    {
      id: @user.id,
      name: @user.name,
      email: @user.email,
      role: @user.role
    }
  end
end
```

- [ ] **Step 3: Create base_controller.rb**

```ruby
# app/controllers/api/v1/base_controller.rb
class Api::V1::BaseController < ActionController::API
  include Pundit::Authorization

  before_action :authenticate_user!

  rescue_from Pundit::NotAuthorizedError, with: :render_forbidden
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable

  private

  def render_forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end

  def render_not_found
    render json: { error: "Not found" }, status: :not_found
  end

  def render_unprocessable(exception)
    render json: { errors: exception.record.errors }, status: :unprocessable_entity
  end
end
```

- [ ] **Step 4: Create registrations controller**

```ruby
# app/controllers/api/v1/auth/registrations_controller.rb
class Api::V1::Auth::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  def create
    build_resource(sign_up_params)
    resource.save
    if resource.persisted?
      sign_in(resource)
      render json: UserSerializer.new(resource).as_json, status: :created
    else
      render json: { errors: resource.errors }, status: :unprocessable_entity
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:name, :email, :password)
  end
end
```

- [ ] **Step 5: Create sessions controller**

```ruby
# app/controllers/api/v1/auth/sessions_controller.rb
class Api::V1::Auth::SessionsController < Devise::SessionsController
  respond_to :json

  private

  def respond_with(resource, _opts = {})
    render json: UserSerializer.new(resource).as_json, status: :ok
  end

  def respond_to_on_destroy
    head :no_content
  end
end
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: add auth request specs"
git add .
git commit -m "feat: add Devise JWT auth (register, login, logout)"
```

---

## Task B4: Books API (TDD)

**Files:**
- Create: `backend/app/policies/application_policy.rb`
- Create: `backend/app/policies/book_policy.rb`
- Create: `backend/app/serializers/book_serializer.rb`
- Create: `backend/app/services/result.rb`
- Create: `backend/app/services/books/search.rb`
- Create: `backend/app/controllers/api/v1/books_controller.rb`
- Create: `backend/spec/requests/api/v1/books_spec.rb`
- Create: `backend/spec/policies/book_policy_spec.rb`
- Create: `backend/spec/services/books/search_spec.rb`

- [ ] **Step 1: Write failing specs**

```ruby
# spec/requests/api/v1/books_spec.rb
require "rails_helper"

RSpec.describe "Books API", type: :request do
  let(:librarian) { create(:user, :librarian) }
  let(:member) { create(:user, :member) }

  describe "GET /api/v1/books" do
    before { create_list(:book, 25) }

    it "returns paginated books for authenticated user" do
      get "/api/v1/books", headers: auth_headers(member)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["books"].length).to eq(20)
      expect(body["meta"]).to be_present
    end

    it "filters by search query" do
      create(:book, title: "Unique Title XYZ")
      get "/api/v1/books", params: { q: "Unique Title XYZ" }, headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["books"].any? { |b| b["title"] == "Unique Title XYZ" }).to be true
    end

    it "returns 401 without auth" do
      get "/api/v1/books"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/books" do
    let(:valid_params) { { book: { title: "T", author: "A", genre: "G", isbn: "978-1234567890", total_copies: 2 } } }

    it "returns 201 as librarian" do
      post "/api/v1/books", params: valid_params, headers: auth_headers(librarian), as: :json
      expect(response).to have_http_status(:created)
    end

    it "returns 403 as member" do
      post "/api/v1/books", params: valid_params, headers: auth_headers(member), as: :json
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 422 with invalid params" do
      post "/api/v1/books", params: { book: { title: "" } }, headers: auth_headers(librarian), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/books/:id" do
    let(:book) { create(:book) }

    it "returns 200 as librarian" do
      patch "/api/v1/books/#{book.id}", params: { book: { title: "New Title" } }, headers: auth_headers(librarian), as: :json
      expect(response).to have_http_status(:ok)
    end

    it "returns 403 as member" do
      patch "/api/v1/books/#{book.id}", params: { book: { title: "New Title" } }, headers: auth_headers(member), as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/books/:id" do
    let(:book) { create(:book) }

    it "returns 204 as librarian" do
      delete "/api/v1/books/#{book.id}", headers: auth_headers(librarian)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 403 as member" do
      delete "/api/v1/books/#{book.id}", headers: auth_headers(member)
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 422 if active borrowings exist" do
      create(:borrowing, book: book)
      delete "/api/v1/books/#{book.id}", headers: auth_headers(librarian)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
```

```ruby
# spec/policies/book_policy_spec.rb
require "rails_helper"

RSpec.describe BookPolicy, type: :policy do
  let(:librarian) { build(:user, :librarian) }
  let(:member) { build(:user, :member) }
  let(:book) { build(:book) }

  describe "librarian permissions" do
    subject { described_class.new(librarian, book) }
    it { should permit_action(:create) }
    it { should permit_action(:update) }
    it { should permit_action(:destroy) }
    it { should permit_action(:index) }
    it { should permit_action(:show) }
  end

  describe "member permissions" do
    subject { described_class.new(member, book) }
    it { should_not permit_action(:create) }
    it { should_not permit_action(:update) }
    it { should_not permit_action(:destroy) }
    it { should permit_action(:index) }
    it { should permit_action(:show) }
  end
end
```

```ruby
# spec/services/books/search_spec.rb
require "rails_helper"

RSpec.describe Books::Search do
  describe ".call" do
    let!(:book1) { create(:book, title: "Ruby Programming", author: "Matz") }
    let!(:book2) { create(:book, title: "Python Guide", genre: "Technology") }

    it "returns all books when no query" do
      result = described_class.call(query: nil, page: 1)
      expect(result.value[:books]).to include(book1, book2)
    end

    it "filters by title" do
      result = described_class.call(query: "ruby", page: 1)
      expect(result.value[:books]).to include(book1)
      expect(result.value[:books]).not_to include(book2)
    end

    it "returns pagy metadata" do
      result = described_class.call(query: nil, page: 1)
      expect(result.value[:pagy]).to be_a(Pagy)
      expect(result.success?).to be true
    end
  end
end
```

- [ ] **Step 2: Create policies**

```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index? = false
  def show? = false
  def create? = false
  def update? = false
  def destroy? = false

  class Scope
    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve = scope.all

    private

    attr_reader :user, :scope
  end
end
```

```ruby
# app/policies/book_policy.rb
class BookPolicy < ApplicationPolicy
  def index? = true
  def show? = true
  def create? = user.librarian?
  def update? = user.librarian?
  def destroy? = user.librarian?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
```

- [ ] **Step 3: Create Result struct and Books::Search service**

```ruby
# app/services/result.rb
Result = Struct.new(:success?, :value, :error, keyword_init: true)
```

```ruby
# app/services/books/search.rb
module Books
  class Search
    include Pagy::Backend

    def self.call(query:, page:)
      new(query:, page:).call
    end

    def initialize(query:, page:)
      @query = query
      @page = page || 1
    end

    def call
      scope = query.present? ? Book.search(query) : Book.all
      scope = scope.order(:title)
      pagy, books = pagy(scope, page: @page)
      Result.new(success?: true, value: { books:, pagy: })
    end

    private

    attr_reader :query, :page

    def pagy(collection, vars = {})
      pagy_metadata = Pagy.new(count: collection.count, **vars)
      books = collection.offset(pagy_metadata.offset).limit(pagy_metadata.limit)
      [pagy_metadata, books]
    end
  end
end
```

- [ ] **Step 4: Create BookSerializer**

```ruby
# app/serializers/book_serializer.rb
class BookSerializer
  def initialize(book)
    @book = book
  end

  def as_json
    {
      id: @book.id,
      title: @book.title,
      author: @book.author,
      genre: @book.genre,
      isbn: @book.isbn,
      total_copies: @book.total_copies,
      available_copies: @book.available_copies
    }
  end
end
```

- [ ] **Step 5: Create BooksController**

```ruby
# app/controllers/api/v1/books_controller.rb
class Api::V1::BooksController < Api::V1::BaseController
  before_action :set_book, only: [:show, :update, :destroy]

  def index
    authorize Book
    result = Books::Search.call(query: params[:q], page: params[:page])
    books = result.value[:books]
    pagy = result.value[:pagy]
    render json: {
      books: books.map { |b| BookSerializer.new(b).as_json },
      meta: {
        current_page: pagy.page,
        total_pages: pagy.pages,
        total_count: pagy.count,
        per_page: pagy.limit
      }
    }
  end

  def show
    authorize @book
    render json: BookSerializer.new(@book).as_json
  end

  def create
    authorize Book
    book = Book.new(book_params)
    if book.save
      render json: BookSerializer.new(book).as_json, status: :created
    else
      render json: { errors: book.errors }, status: :unprocessable_entity
    end
  end

  def update
    authorize @book
    if @book.update(book_params)
      render json: BookSerializer.new(@book).as_json
    else
      render json: { errors: @book.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @book
    if @book.borrowings.active.exists?
      render json: { error: "Cannot delete book with active borrowings" }, status: :unprocessable_entity
    else
      @book.destroy
      head :no_content
    end
  end

  private

  def set_book
    @book = Book.find(params[:id])
  end

  def book_params
    params.require(:book).permit(:title, :author, :genre, :isbn, :total_copies)
  end
end
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: add book request specs, policy specs, service specs"
git add .
git commit -m "feat: add Books API with Pundit policy and search service"
```

---

## Task B5: Borrowings API (TDD)

**Files:**
- Create: `backend/app/policies/borrowing_policy.rb`
- Create: `backend/app/serializers/borrowing_serializer.rb`
- Create: `backend/app/services/borrowings/create.rb`
- Create: `backend/app/services/borrowings/return_book.rb`
- Create: `backend/app/controllers/api/v1/borrowings_controller.rb`
- Create: `backend/spec/requests/api/v1/borrowings_spec.rb`
- Create: `backend/spec/services/borrowings/create_spec.rb`

- [ ] **Step 1: Write failing specs**

```ruby
# spec/requests/api/v1/borrowings_spec.rb
require "rails_helper"

RSpec.describe "Borrowings API", type: :request do
  let(:librarian) { create(:user, :librarian) }
  let(:member) { create(:user, :member) }
  let(:book) { create(:book, total_copies: 2) }

  describe "POST /api/v1/books/:book_id/borrowings" do
    it "returns 201 as member" do
      post "/api/v1/books/#{book.id}/borrowings",
        headers: auth_headers(member), as: :json
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["book_id"]).to eq(book.id)
      expect(body["user_id"]).to eq(member.id)
      expect(body["returned_at"]).to be_nil
    end

    it "returns 403 as librarian" do
      post "/api/v1/books/#{book.id}/borrowings",
        headers: auth_headers(librarian), as: :json
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 422 when book unavailable" do
      book.update!(total_copies: 0)
      post "/api/v1/books/#{book.id}/borrowings",
        headers: auth_headers(member), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when duplicate active borrowing" do
      create(:borrowing, user: member, book: book)
      post "/api/v1/books/#{book.id}/borrowings",
        headers: auth_headers(member), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/borrowings/:id/return" do
    let(:borrowing) { create(:borrowing, user: member, book: book) }

    it "returns 200 as librarian" do
      patch "/api/v1/borrowings/#{borrowing.id}/return",
        headers: auth_headers(librarian)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["returned_at"]).to be_present
    end

    it "returns 403 as member" do
      patch "/api/v1/borrowings/#{borrowing.id}/return",
        headers: auth_headers(member)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/v1/borrowings" do
    let!(:member2) { create(:user, :member) }
    let!(:borrowing_member) { create(:borrowing, user: member, book: book) }
    let!(:borrowing_other) { create(:borrowing, user: member2, book: create(:book)) }

    it "returns all borrowings as librarian" do
      get "/api/v1/borrowings", headers: auth_headers(librarian)
      expect(response).to have_http_status(:ok)
      ids = JSON.parse(response.body).map { |b| b["id"] }
      expect(ids).to include(borrowing_member.id, borrowing_other.id)
    end

    it "returns only own borrowings as member" do
      get "/api/v1/borrowings", headers: auth_headers(member)
      ids = JSON.parse(response.body).map { |b| b["id"] }
      expect(ids).to include(borrowing_member.id)
      expect(ids).not_to include(borrowing_other.id)
    end
  end
end
```

```ruby
# spec/services/borrowings/create_spec.rb
require "rails_helper"

RSpec.describe Borrowings::Create do
  let(:member) { create(:user, :member) }
  let(:book) { create(:book, total_copies: 2) }

  describe ".call" do
    it "creates a borrowing and returns success" do
      result = described_class.call(book:, user: member)
      expect(result.success?).to be true
      expect(result.value).to be_a(Borrowing)
      expect(result.value.due_at).to be_within(1.second).of(result.value.borrowed_at + 2.weeks)
    end

    it "fails when book has no available copies" do
      book.update!(total_copies: 0)
      result = described_class.call(book:, user: member)
      expect(result.success?).to be false
      expect(result.error).to eq("Book is not available")
    end

    it "fails when user already has active borrowing for same book" do
      create(:borrowing, user: member, book: book)
      result = described_class.call(book:, user: member)
      expect(result.success?).to be false
      expect(result.error).to eq("You already have an active borrowing for this book")
    end
  end
end
```

- [ ] **Step 2: Create services**

```ruby
# app/services/borrowings/create.rb
module Borrowings
  class Create
    def self.call(book:, user:)
      new(book:, user:).call
    end

    def initialize(book:, user:)
      @book = book
      @user = user
    end

    def call
      return Result.new(success?: false, error: "Book is not available") if @book.available_copies <= 0
      return Result.new(success?: false, error: "You already have an active borrowing for this book") if duplicate_borrowing?

      borrowing = @book.borrowings.build(user: @user)
      if borrowing.save
        Result.new(success?: true, value: borrowing)
      else
        Result.new(success?: false, error: borrowing.errors.full_messages.join(", "))
      end
    end

    private

    def duplicate_borrowing?
      Borrowing.active.exists?(user: @user, book: @book)
    end
  end
end
```

```ruby
# app/services/borrowings/return_book.rb
module Borrowings
  class ReturnBook
    def self.call(borrowing:)
      new(borrowing:).call
    end

    def initialize(borrowing:)
      @borrowing = borrowing
    end

    def call
      if @borrowing.returned_at.present?
        return Result.new(success?: false, error: "Already returned")
      end

      if @borrowing.update(returned_at: Time.current)
        Result.new(success?: true, value: @borrowing)
      else
        Result.new(success?: false, error: @borrowing.errors.full_messages.join(", "))
      end
    end
  end
end
```

- [ ] **Step 3: Create BorrowingSerializer**

```ruby
# app/serializers/borrowing_serializer.rb
class BorrowingSerializer
  def initialize(borrowing)
    @borrowing = borrowing
  end

  def as_json
    {
      id: @borrowing.id,
      user_id: @borrowing.user_id,
      book_id: @borrowing.book_id,
      book: BookSerializer.new(@borrowing.book).as_json,
      borrowed_at: @borrowing.borrowed_at,
      due_at: @borrowing.due_at,
      returned_at: @borrowing.returned_at,
      overdue: @borrowing.returned_at.nil? && @borrowing.due_at < Time.current
    }
  end
end
```

- [ ] **Step 4: Create BorrowingPolicy**

```ruby
# app/policies/borrowing_policy.rb
class BorrowingPolicy < ApplicationPolicy
  def create? = user.member?
  def return_book? = user.librarian?
  def index? = true

  class Scope < ApplicationPolicy::Scope
    def resolve
      user.librarian? ? scope.all : scope.where(user:)
    end
  end
end
```

- [ ] **Step 5: Create BorrowingsController**

```ruby
# app/controllers/api/v1/borrowings_controller.rb
class Api::V1::BorrowingsController < Api::V1::BaseController
  def index
    authorize Borrowing
    borrowings = policy_scope(Borrowing)
      .includes(:user, book: :borrowings)
      .order(created_at: :desc)
    render json: borrowings.map { |b| BorrowingSerializer.new(b).as_json }
  end

  def create
    book = Book.find(params[:book_id])
    authorize Borrowing
    result = Borrowings::Create.call(book:, user: current_user)
    if result.success?
      render json: BorrowingSerializer.new(result.value).as_json, status: :created
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  def return_book
    borrowing = Borrowing.find(params[:id])
    authorize borrowing, :return_book?
    result = Borrowings::ReturnBook.call(borrowing:)
    if result.success?
      render json: BorrowingSerializer.new(result.value).as_json
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end
end
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: add borrowings request specs and service specs"
git add .
git commit -m "feat: add Borrowings API with create/return/list"
```

---

## Task B6: Dashboards API + Seeds (TDD)

**Files:**
- Create: `backend/app/queries/overdue_borrowings_query.rb`
- Create: `backend/app/queries/due_today_borrowings_query.rb`
- Create: `backend/app/services/dashboards/librarian_stats.rb`
- Create: `backend/app/services/dashboards/member_stats.rb`
- Create: `backend/app/controllers/api/v1/dashboards_controller.rb`
- Create: `backend/spec/requests/api/v1/dashboards_spec.rb`
- Create: `backend/db/seeds.rb`

- [ ] **Step 1: Write failing specs**

```ruby
# spec/requests/api/v1/dashboards_spec.rb
require "rails_helper"

RSpec.describe "Dashboards API", type: :request do
  let(:librarian) { create(:user, :librarian) }
  let(:member) { create(:user, :member) }

  describe "GET /api/v1/dashboard/librarian" do
    before do
      books = create_list(:book, 3, total_copies: 5)
      create(:borrowing, book: books[0])
      create(:borrowing, :overdue, book: books[1])
    end

    it "returns librarian stats" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(librarian)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to include(
        "total_books", "total_borrowed", "due_today", "members_with_overdue"
      )
      expect(body["total_books"]).to eq(Book.count)
      expect(body["total_borrowed"]).to be >= 2
    end

    it "returns 403 for member" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(member)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/v1/dashboard/member" do
    before do
      book = create(:book)
      create(:borrowing, user: member, book: book)
      create(:borrowing, :overdue, user: member, book: create(:book, total_copies: 5))
    end

    it "returns member stats" do
      get "/api/v1/dashboard/member", headers: auth_headers(member)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to include("borrowed_books", "overdue_books")
      expect(body["borrowed_books"]).to be >= 1
      expect(body["overdue_books"]).to be >= 1
    end

    it "returns 403 for librarian" do
      get "/api/v1/dashboard/member", headers: auth_headers(librarian)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
```

- [ ] **Step 2: Create query objects**

```ruby
# app/queries/overdue_borrowings_query.rb
class OverdueBorrowingsQuery
  def self.call(scope = Borrowing.all)
    scope.active.where("due_at < ?", Time.current).includes(:user, :book)
  end
end
```

```ruby
# app/queries/due_today_borrowings_query.rb
class DueTodayBorrowingsQuery
  def self.call(scope = Borrowing.all)
    scope.active.where(due_at: Date.current.all_day).includes(:user, :book)
  end
end
```

- [ ] **Step 3: Create dashboard services**

```ruby
# app/services/dashboards/librarian_stats.rb
module Dashboards
  class LibrarianStats
    def self.call
      new.call
    end

    def call
      overdue = OverdueBorrowingsQuery.call
      due_today = DueTodayBorrowingsQuery.call
      Result.new(
        success?: true,
        value: {
          total_books: Book.count,
          total_borrowed: Borrowing.active.count,
          due_today: due_today.count,
          members_with_overdue: overdue.select(:user_id).distinct.count
        }
      )
    end
  end
end
```

```ruby
# app/services/dashboards/member_stats.rb
module Dashboards
  class MemberStats
    def self.call(user:)
      new(user:).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      active = Borrowing.active.where(user: @user).includes(:book)
      overdue = OverdueBorrowingsQuery.call(Borrowing.where(user: @user))
      Result.new(
        success?: true,
        value: {
          borrowed_books: active.count,
          overdue_books: overdue.count
        }
      )
    end
  end
end
```

- [ ] **Step 4: Create DashboardsController with a Pundit policy**

Add to `app/policies/application_policy.rb` the DashboardPolicy, or create a dedicated one:

```ruby
# app/policies/dashboard_policy.rb
class DashboardPolicy < ApplicationPolicy
  def librarian? = user.librarian?
  def member? = user.member?
end
```

```ruby
# app/controllers/api/v1/dashboards_controller.rb
class Api::V1::DashboardsController < Api::V1::BaseController
  def librarian
    authorize :dashboard, :librarian?
    result = Dashboards::LibrarianStats.call
    render json: result.value
  end

  def member
    authorize :dashboard, :member?
    result = Dashboards::MemberStats.call(user: current_user)
    render json: result.value
  end
end
```

Note: for symbol-based `authorize :dashboard, :librarian?`, Pundit will look for `DashboardPolicy`. This works with a `DashboardPolicy` where the record is `:dashboard` (a symbol). Use `headless policy` pattern:

Actually use a simpler approach — check roles directly via the policy:

```ruby
# app/controllers/api/v1/dashboards_controller.rb
class Api::V1::DashboardsController < Api::V1::BaseController
  def librarian
    raise Pundit::NotAuthorizedError unless current_user.librarian?
    result = Dashboards::LibrarianStats.call
    render json: result.value
  end

  def member
    raise Pundit::NotAuthorizedError unless current_user.member?
    result = Dashboards::MemberStats.call(user: current_user)
    render json: result.value
  end
end
```

- [ ] **Step 5: Create idempotent seeds**

```ruby
# db/seeds.rb
# Idempotent seed file — safe to run multiple times

puts "Seeding database..."

# Librarian
librarian = User.find_or_create_by!(email: "librarian@library.com") do |u|
  u.name = "Head Librarian"
  u.password = "password123"
  u.role = :librarian
end
puts "  Librarian: #{librarian.email}"

# Members
3.times do |i|
  member = User.find_or_create_by!(email: "member#{i + 1}@library.com") do |u|
    u.name = "Member #{i + 1}"
    u.password = "password123"
    u.role = :member
  end
  puts "  Member: #{member.email}"
end

# Books
books_data = [
  { title: "The Pragmatic Programmer", author: "David Thomas", genre: "Technology", isbn: "978-0135957059", total_copies: 3 },
  { title: "Clean Code", author: "Robert C. Martin", genre: "Technology", isbn: "978-0132350884", total_copies: 2 },
  { title: "Design Patterns", author: "Gang of Four", genre: "Technology", isbn: "978-0201633610", total_copies: 4 },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Fiction", isbn: "978-0743273565", total_copies: 5 },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Fiction", isbn: "978-0061935466", total_copies: 3 },
  { title: "1984", author: "George Orwell", genre: "Fiction", isbn: "978-0451524935", total_copies: 4 },
  { title: "Dune", author: "Frank Herbert", genre: "Science Fiction", isbn: "978-0441013593", total_copies: 2 },
  { title: "Foundation", author: "Isaac Asimov", genre: "Science Fiction", isbn: "978-0553293357", total_copies: 3 },
  { title: "Neuromancer", author: "William Gibson", genre: "Science Fiction", isbn: "978-0441569595", total_copies: 2 },
  { title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", isbn: "978-0547928227", total_copies: 4 },
  { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", genre: "Fantasy", isbn: "978-0439708180", total_copies: 5 },
  { title: "A Brief History of Time", author: "Stephen Hawking", genre: "Science", isbn: "978-0553380163", total_copies: 2 },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "History", isbn: "978-0062316110", total_copies: 3 },
  { title: "The Art of War", author: "Sun Tzu", genre: "Philosophy", isbn: "978-1590302255", total_copies: 6 },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "Psychology", isbn: "978-0374533557", total_copies: 2 }
]

books = books_data.map do |data|
  book = Book.find_or_create_by!(isbn: data[:isbn]) do |b|
    b.title = data[:title]
    b.author = data[:author]
    b.genre = data[:genre]
    b.total_copies = data[:total_copies]
  end
  puts "  Book: #{book.title}"
  book
end

# Borrowings — only create if not already borrowed
members = User.where(role: :member)

# Active borrowing
if Borrowing.active.none?
  b = Borrowing.create!(
    user: members.first,
    book: books[0],
    borrowed_at: 1.week.ago,
    due_at: 1.week.from_now
  )
  puts "  Active borrowing: #{members.first.email} → #{books[0].title}"

  # Overdue borrowing
  Borrowing.create!(
    user: members.second || members.first,
    book: books[1],
    borrowed_at: 3.weeks.ago,
    due_at: 1.week.ago
  )
  puts "  Overdue borrowing created"

  # Due today
  Borrowing.create!(
    user: members.last,
    book: books[2],
    borrowed_at: 2.weeks.ago,
    due_at: Date.current.end_of_day
  )
  puts "  Due today borrowing created"
end

puts "Seeding complete!"
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: add dashboard request specs"
git add .
git commit -m "feat: add dashboards API with query objects and services"
git add .
git commit -m "feat: add idempotent seeds with demo credentials"
```

---

## Task F1: Frontend Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/biome.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/providers/AuthProvider.tsx`
- Create: `frontend/src/shared/api/client.ts`
- Create: `frontend/src/shared/config/env.ts`
- Create: `frontend/src/shared/lib/cn.ts`
- Create: `frontend/src/entities/user/model/store.ts`
- Create: `frontend/src/entities/user/model/types.ts`
- Create: `frontend/src/app/styles/globals.css`

**All packages must use exact versions to ensure reproducible builds:**

```json
{
  "name": "library-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "swr": "^2.3.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.10.0",
    "zod": "^3.24.0",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^25.0.0"
  }
}
```

Create the following key files:

- `frontend/src/shared/config/env.ts`:
```typescript
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
```

- `frontend/src/entities/user/model/types.ts`:
```typescript
export type Role = "member" | "librarian";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}
```

- `frontend/src/entities/user/model/store.ts`:
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: "auth" }
  )
);
```

- `frontend/src/shared/api/client.ts`:
```typescript
import { API_URL } from "../config/env";
import { useAuthStore } from "../../entities/user/model/store";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super(`API Error ${status}`);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const token = useAuthStore.getState().token;

  let url = `${API_URL}${path}`;
  if (params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) search.set(k, String(v));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "GET", ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...options }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...options }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...options }),
  raw: async (path: string, options: RequestOptions = {}): Promise<Response> => {
    const { params, ...init } = options;
    const token = useAuthStore.getState().token;
    let url = `${API_URL}${path}`;
    if (params) {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) search.set(k, String(v));
      }
      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, { ...init, headers });
  },
};

export { ApiError };
```

- `frontend/src/app/router.tsx` (placeholder, filled in F2):
```typescript
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  // Routes added in feature tasks
]);
```

- `frontend/src/main.tsx`:
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import "./app/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

- `frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Library Management System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- `frontend/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
```

- `frontend/tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

- `frontend/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- `frontend/biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": false, "ignore": ["node_modules", "dist"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "trailingCommas": "es5" }
  }
}
```

- `frontend/src/app/styles/globals.css`:
```css
@import "tailwindcss";
```

- `frontend/src/shared/lib/cn.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Commit:**
```bash
git add .
git commit -m "feat: initialize Vite React 19 frontend with TypeScript, Tailwind v4, Zustand auth"
```

---

## Task F2: Auth UI

**Files:**
- Create: `frontend/src/features/auth-login/ui/LoginForm.tsx`
- Create: `frontend/src/features/auth-login/model/schema.ts`
- Create: `frontend/src/features/auth-register/ui/RegisterForm.tsx`
- Create: `frontend/src/features/auth-register/model/schema.ts`
- Create: `frontend/src/features/auth-logout/ui/LogoutButton.tsx`
- Create: `frontend/src/pages/login/LoginPage.tsx`
- Create: `frontend/src/pages/register/RegisterPage.tsx`
- Create: `frontend/src/shared/ui/Button.tsx`
- Create: `frontend/src/shared/ui/Input.tsx`
- Create: `frontend/src/shared/ui/Card.tsx`
- Modify: `frontend/src/app/router.tsx`

**Key implementation:**

Auth login schema:
```typescript
// features/auth-login/model/schema.ts
import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginFormData = z.infer<typeof loginSchema>;
```

LoginForm (uses react-hook-form + zod):
```typescript
// features/auth-login/ui/LoginForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { loginSchema, type LoginFormData } from "../model/schema";
import { useAuthStore } from "../../../entities/user/model/store";
import { apiClient } from "../../../shared/api/client";
import { API_URL } from "../../../shared/config/env";

export function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Need raw response to capture Authorization header
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: data }),
      });
      if (!res.ok) {
        setError("root", { message: "Invalid email or password" });
        return;
      }
      const token = res.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
      const user = await res.json();
      setAuth(token, user);
      navigate(user.role === "librarian" ? "/dashboard/librarian" : "/dashboard/member");
    } catch {
      setError("root", { message: "Network error. Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input {...register("email")} type="email" className="w-full border rounded px-3 py-2" />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input {...register("password")} type="password" className="w-full border rounded px-3 py-2" />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
      </div>
      {errors.root && <p className="text-red-500 text-sm">{errors.root.message}</p>}
      <button type="submit" disabled={isSubmitting}
        className="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50">
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

Router with auth guards:
```typescript
// app/router.tsx
import { createBrowserRouter, redirect } from "react-router";
import { useAuthStore } from "../entities/user/model/store";

function requireAuth() {
  const token = useAuthStore.getState().token;
  if (!token) return redirect("/login");
  return null;
}

function requireLibrarian() {
  const { token, user } = useAuthStore.getState();
  if (!token) return redirect("/login");
  if (user?.role !== "librarian") return redirect("/dashboard/member");
  return null;
}

function requireMember() {
  const { token, user } = useAuthStore.getState();
  if (!token) return redirect("/login");
  if (user?.role !== "member") return redirect("/dashboard/librarian");
  return null;
}

export const router = createBrowserRouter([
  { path: "/login", lazy: () => import("../pages/login/LoginPage").then((m) => ({ Component: m.LoginPage })) },
  { path: "/register", lazy: () => import("../pages/register/RegisterPage").then((m) => ({ Component: m.RegisterPage })) },
  {
    path: "/",
    loader: requireAuth,
    lazy: () => import("../pages/layout/Layout").then((m) => ({ Component: m.Layout })),
    children: [
      { index: true, loader: () => {
        const role = useAuthStore.getState().user?.role;
        return redirect(role === "librarian" ? "/dashboard/librarian" : "/dashboard/member");
      }},
      { path: "books", lazy: () => import("../pages/books-list/BooksListPage").then((m) => ({ Component: m.BooksListPage })) },
      { path: "books/new", loader: requireLibrarian, lazy: () => import("../pages/book-edit/BookEditPage").then((m) => ({ Component: m.BookEditPage })) },
      { path: "books/:id/edit", loader: requireLibrarian, lazy: () => import("../pages/book-edit/BookEditPage").then((m) => ({ Component: m.BookEditPage })) },
      { path: "dashboard/librarian", loader: requireLibrarian, lazy: () => import("../pages/dashboard-librarian/DashboardLibrarianPage").then((m) => ({ Component: m.DashboardLibrarianPage })) },
      { path: "dashboard/member", loader: requireMember, lazy: () => import("../pages/dashboard-member/DashboardMemberPage").then((m) => ({ Component: m.DashboardMemberPage })) },
    ],
  },
  { path: "*", loader: () => redirect("/") },
]);
```

---

## Task F3: Books UI

**Files:**
- Create: `frontend/src/entities/book/model/types.ts`
- Create: `frontend/src/entities/book/api/useBooks.ts`
- Create: `frontend/src/entities/book/api/bookApi.ts`
- Create: `frontend/src/entities/book/ui/BookCard.tsx`
- Create: `frontend/src/features/book-search/ui/BookSearch.tsx`
- Create: `frontend/src/features/book-create/ui/BookForm.tsx`
- Create: `frontend/src/features/book-create/model/schema.ts`
- Create: `frontend/src/features/book-delete/ui/DeleteBookButton.tsx`
- Create: `frontend/src/features/book-borrow/ui/BorrowButton.tsx`
- Create: `frontend/src/pages/books-list/BooksListPage.tsx`
- Create: `frontend/src/pages/book-edit/BookEditPage.tsx`
- Create: `frontend/src/pages/layout/Layout.tsx`

```typescript
// entities/book/model/types.ts
export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  total_copies: number;
  available_copies: number;
}

export interface BooksResponse {
  books: Book[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}
```

```typescript
// entities/book/api/useBooks.ts
import useSWR from "swr";
import { apiClient } from "../../../shared/api/client";
import type { BooksResponse } from "../model/types";

export function useBooks(query?: string, page = 1) {
  const key = `/api/v1/books?q=${query ?? ""}&page=${page}`;
  return useSWR<BooksResponse>(key, () =>
    apiClient.get<BooksResponse>("/api/v1/books", { params: { q: query, page } })
  );
}
```

```typescript
// entities/book/api/bookApi.ts
import { apiClient } from "../../../shared/api/client";
import type { Book } from "../model/types";

export const bookApi = {
  create: (data: Omit<Book, "id" | "available_copies">) =>
    apiClient.post<Book>("/api/v1/books", { book: data }),
  update: (id: number, data: Partial<Book>) =>
    apiClient.patch<Book>(`/api/v1/books/${id}`, { book: data }),
  delete: (id: number) =>
    apiClient.delete<void>(`/api/v1/books/${id}`),
};
```

BooksListPage should show:
- Search input with debounce (200ms)
- Grid of book cards (responsive: 1 col mobile, 3 cols md)
- Pagination controls
- Librarians see Edit/Delete buttons per book
- Members see "Borrow" button (if available_copies > 0)

BookCard displays: title, author, genre, isbn, available/total copies badge.

---

## Task F4: Borrowings + Dashboard UI

**Files:**
- Create: `frontend/src/entities/borrowing/model/types.ts`
- Create: `frontend/src/entities/borrowing/api/useBorrowings.ts`
- Create: `frontend/src/entities/borrowing/api/borrowingApi.ts`
- Create: `frontend/src/features/book-return/ui/ReturnButton.tsx`
- Create: `frontend/src/pages/dashboard-librarian/DashboardLibrarianPage.tsx`
- Create: `frontend/src/pages/dashboard-member/DashboardMemberPage.tsx`

```typescript
// entities/borrowing/model/types.ts
import type { Book } from "../../book/model/types";

export interface Borrowing {
  id: number;
  user_id: number;
  book_id: number;
  book: Book;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  overdue: boolean;
}
```

```typescript
// entities/borrowing/api/useBorrowings.ts
import useSWR from "swr";
import { apiClient } from "../../../shared/api/client";
import type { Borrowing } from "../model/types";

export function useBorrowings() {
  return useSWR<Borrowing[]>("/api/v1/borrowings", () =>
    apiClient.get<Borrowing[]>("/api/v1/borrowings")
  );
}
```

Dashboard librarian shows: total_books, total_borrowed, due_today, members_with_overdue cards + borrowings table with return button.
Dashboard member shows: borrowed_books count, overdue_books count + their borrowings list with overdue highlights.

---

## Shared UI Components

All pages use a consistent Layout component with:
- Top nav: "Library" logo + user name + logout button
- Role-based nav links (Books always; Dashboard varies by role)
- Main content area with padding

Reusable components in `shared/ui/`:
- `Button.tsx` — variant prop (primary, danger, ghost)
- `Input.tsx` — forwarded ref, error prop
- `Card.tsx` — container with shadow
- `Badge.tsx` — available/overdue status badges
- `Spinner.tsx` — loading state

---

## Task GENAI: GENAI.md + READMEs

See `PROMPT.md` for the required GENAI.md content. Write it in `GENAI.md` at the root. READMEs go in `README.md` (root), `backend/README.md`, `frontend/README.md`.

---
