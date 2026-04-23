require "rails_helper"

RSpec.describe "E2E: Dashboard", type: :request, e2e: true do
  let(:librarian) { User.find_by!(email: "e2e_librarian@library.com") }
  let(:member1)   { User.find_by!(email: "e2e_member1@library.com") }
  let(:member2)   { User.find_by!(email: "e2e_member2@library.com") }

  let(:librarian_headers) { auth_headers(librarian) }
  let(:member1_headers)   { auth_headers(member1) }
  let(:member2_headers)   { auth_headers(member2) }

  # ── Librarian dashboard ────────────────────────────────────────────────────────

  describe "GET /api/v1/dashboard/librarian" do
    it "returns the expected response shape" do
      get "/api/v1/dashboard/librarian", headers: librarian_headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body).to include("total_books", "total_borrowed", "due_today", "members_with_overdue")
    end

    it "reflects the known seeded state: 25 books, 3 active borrowings, 1 member with overdue" do
      get "/api/v1/dashboard/librarian", headers: librarian_headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)

      # Seeds create exactly 25 books
      expect(body["total_books"]).to eq(25)

      # Seeds create exactly 3 active borrowings (E2E-008, E2E-009, E2E-010 all have nil returned_at)
      expect(body["total_borrowed"]).to eq(3)

      # member1 has E2E-010 which is overdue (due_at 7 days ago)
      expect(body["members_with_overdue"]).to eq(1)

      # due_today is an integer (exact value depends on time — just assert it is numeric)
      expect(body["due_today"]).to be_a(Integer)
    end
  end

  # ── Member dashboard ───────────────────────────────────────────────────────────

  describe "GET /api/v1/dashboard/member" do
    it "returns the expected response shape for member1" do
      get "/api/v1/dashboard/member", headers: member1_headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body).to include("borrowed_books", "overdue_books")
    end

    it "reflects member1's known state: 2 active borrowings, 1 overdue" do
      # member1 has:
      #   - E2E-008 active (due in 11 days) → active, not overdue
      #   - E2E-010 active but overdue (due_at 7 days ago) → active + overdue
      get "/api/v1/dashboard/member", headers: member1_headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["borrowed_books"]).to eq(2)
      expect(body["overdue_books"]).to eq(1)
    end

    it "reflects member2's known state: 1 active borrowing, 0 overdue" do
      # member2 has E2E-009 active (due in 9 days)
      get "/api/v1/dashboard/member", headers: member2_headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body["borrowed_books"]).to eq(1)
      expect(body["overdue_books"]).to eq(0)
    end

    context "after member2 borrows an additional book" do
      let(:book) { Book.find_by!(isbn: "E2E-006") }

      after do
        # Restore seed state: return any E2E-006 active borrowing by member2
        Borrowing.active.where(book: book, user: member2).update_all(returned_at: Time.current)
      end

      it "borrowed_books increments by 1" do
        # Baseline
        get "/api/v1/dashboard/member", headers: member2_headers
        baseline = JSON.parse(response.body)["borrowed_books"]

        # Borrow E2E-006
        post "/api/v1/books/#{book.id}/borrowings",
          headers: member2_headers,
          as: :json
        expect(response).to have_http_status(:created)

        # Verify increment
        get "/api/v1/dashboard/member", headers: member2_headers
        expect(response).to have_http_status(:ok)

        new_count = JSON.parse(response.body)["borrowed_books"]
        expect(new_count).to eq(baseline + 1)
      end
    end
  end
end
