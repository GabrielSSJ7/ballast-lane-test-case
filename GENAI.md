# GenAI Section — Task Management API

This document fulfills the GenAI requirement: generating a Task Management API, evaluating the output, and documenting corrections.

---

## The Prompt

The following prompt was used to generate a Task Management API implementation:

> **Prompt:**
> 
> Generate a Ruby on Rails 8 API-only app for a Task Management system following clean architecture. Requirements:
> 
> **Models:**
> - `User` (has many tasks, authenticated via Devise + JWT)
> - `Task` (belongs to user, has: title (string, required), description (text, optional), status enum (pending/in_progress/completed, default: pending), priority enum (low/medium/high, default: medium), due_date (date, optional))
> 
> **Endpoints:**
> - `POST /api/v1/auth/register` — creates user, returns JWT in Authorization header
> - `POST /api/v1/auth/login` — returns JWT
> - `DELETE /api/v1/auth/logout` — revokes JWT
> - `GET /api/v1/tasks` — lists own tasks, filterable by status and priority
> - `POST /api/v1/tasks` — creates task
> - `PATCH /api/v1/tasks/:id` — updates task
> - `DELETE /api/v1/tasks/:id` — deletes task (only own tasks)
> 
> **Rules:**
> - JWT via `devise-jwt` with denylist revocation
> - Pundit for authorization (users can only CRUD their own tasks)
> - Service objects returning a `Result` struct for create/update
> - PORO serializers (no gems)
> - RSpec request specs with FactoryBot
> 
> Generate the complete implementation including: Gemfile, models, migrations, routes, controllers, policies, services, serializers, and key request specs.

---

## Sample Generated Output

The model generated the following key files (excerpt):

### `app/models/task.rb`
```ruby
class Task < ApplicationRecord
  belongs_to :user

  enum :status, { pending: 0, in_progress: 1, completed: 2 }, default: :pending
  enum :priority, { low: 0, medium: 1, high: 2 }, default: :medium

  validates :title, presence: true
  validates :status, inclusion: { in: statuses.keys }
  validates :priority, inclusion: { in: priorities.keys }

  scope :by_status, ->(status) { where(status: status) if status.present? }
  scope :by_priority, ->(priority) { where(priority: priority) if priority.present? }
end
```

### `app/services/tasks/create.rb`
```ruby
module Tasks
  class Create
    def self.call(user:, params:)
      task = user.tasks.build(params)
      if task.save
        Result.new(success?: true, value: task)
      else
        Result.new(success?: false, error: task.errors.full_messages.join(", "))
      end
    end
  end
end
```

### `app/policies/task_policy.rb`
```ruby
class TaskPolicy < ApplicationPolicy
  def index? = true
  def create? = true
  def update? = record.user == user
  def destroy? = record.user == user

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(user: user)
    end
  end
end
```

### `spec/requests/api/v1/tasks_spec.rb` (excerpt)
```ruby
RSpec.describe "Tasks API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe "GET /api/v1/tasks" do
    it "returns only own tasks" do
      create(:task, user: user)
      create(:task)
      get "/api/v1/tasks", headers: headers
      expect(JSON.parse(response.body).length).to eq(1)
    end

    it "filters by status" do
      create(:task, user: user, status: :completed)
      create(:task, user: user, status: :pending)
      get "/api/v1/tasks", params: { status: "completed" }, headers: headers
      expect(JSON.parse(response.body).length).to eq(1)
    end
  end
end
```

---

## Critical Evaluation

### What Worked Well

**1. Correct service object pattern.** The `Tasks::Create` service correctly uses the `Result` struct and avoids raising exceptions for business rule violations. The pattern matches the clean architecture intent.

**2. Pundit scope correctly isolates user data.** The `TaskPolicy::Scope#resolve` using `scope.where(user: user)` is the right approach — it ensures list endpoints always filter by the current user, preventing data leaks.

**3. Enum definitions are idiomatic.** Using `enum :status, { ... }, default: :pending` with Rails 8 keyword syntax is correct and avoids the deprecated positional argument form.

**4. Basic request specs cover the happy path** for authentication and task ownership isolation.

### Issues Found and Corrections

**Issue 1: Redundant enum inclusion validations**

The generated model had:
```ruby
validates :status, inclusion: { in: statuses.keys }
validates :priority, inclusion: { in: priorities.keys }
```
Rails enums already raise `ArgumentError` for invalid values — these validations are redundant and actually interact poorly with enum behavior (the `in: statuses.keys` returns string keys while the enum setter expects symbols or integers). Removed.

**Issue 2: Scope lambdas with conditional — won't chain correctly**

Generated:
```ruby
scope :by_status, ->(status) { where(status: status) if status.present? }
```
When `status` is blank, this returns `nil` instead of `self`, breaking chain calls like `Task.by_status(nil).by_priority("high")`. Correction:
```ruby
scope :by_status, ->(status) { status.present? ? where(status: status) : all }
scope :by_priority, ->(priority) { priority.present? ? where(priority: priority) : all }
```

**Issue 3: Missing `show?` in TaskPolicy**

The generated policy defined `update?` and `destroy?` checking `record.user == user`, but omitted `show?`. A GET /api/v1/tasks/:id endpoint would fail silently (default false from ApplicationPolicy). Added:
```ruby
def show? = record.user == user
```

**Issue 4: Spec creates a task with `create(:task)` — needs a user association**

The spec line `create(:task)` without a user will fail if the factory doesn't have a default user association. The factory was missing:
```ruby
factory :task do
  association :user   # ← missing in generated output
  title { Faker::Lorem.sentence }
  status { :pending }
  priority { :medium }
end
```

**Issue 5: The `show` action was not generated**

The generated controller only had `index`, `create`, `update`, `destroy`. While the spec didn't test it, a usable API needs `show`. The route `resources :tasks` generates it implicitly. Controller action added manually.

**Issue 6: JWT dispatch_requests regex didn't match**

Generated:
```ruby
jwt.dispatch_requests = [["POST", %r{/api/v1/auth/login}]]
```
The regex without anchors (`^...$`) will match any URL containing `/api/v1/auth/login`, including unintended ones. Corrected to:
```ruby
jwt.dispatch_requests = [["POST", %r{^/api/v1/auth/login$}]]
```

### Overall Assessment

The generated output provided a solid 70% foundation. The architecture decisions (services, Pundit, PORO serializers) were correctly understood and applied. However, the output required meaningful corrections before it would run correctly:

- 2 bugs that would cause runtime errors (scope returns nil, regex without anchors)
- 2 missing pieces (show action, factory association)
- 2 anti-patterns to clean up (redundant validations, missing show policy)

The model demonstrated strong knowledge of Rails patterns and clean architecture conventions but made subtle mistakes that would only be caught by actually running the tests. This reinforces that GenAI output should always be treated as a first draft requiring human review, test execution, and edge-case validation before production use.
