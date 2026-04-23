require "rails_helper"

RSpec.describe "E2E: Authorization boundaries", type: :request, e2e: true do
  let(:librarian) { User.find_by!(email: "e2e_librarian@library.com") }
  let(:member1)   { User.find_by!(email: "e2e_member1@library.com") }

  let(:librarian_headers) { auth_headers(librarian) }
  let(:member_headers)    { auth_headers(member1) }

  # Any seeded book is fine for tests that need an existing book ID
  let(:any_book) { Book.find_by!(isbn: "E2E-007") }

  # A seeded borrowing belonging to member1 (E2E-008 borrowing)
  let(:member1_borrowing) do
    Borrowing.active.find_by!(user: member1, book: Book.find_by!(isbn: "E2E-008"))
  end

  # ── Member cannot manage books ─────────────────────────────────────────────────

  describe "POST /api/v1/books (member)" do
    it "returns 403 Forbidden" do
      post "/api/v1/books",
        params: { book: {
          title: "Unauthorized Book",
          author: "Someone",
          genre: "Genre",
          isbn: "E2E-UNAUTH-#{SecureRandom.hex(4)}",
          total_copies: 1
        } },
        headers: member_headers,
        as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/books/:id (member)" do
    it "returns 403 Forbidden" do
      patch "/api/v1/books/#{any_book.id}",
        params: { book: { title: "Hacked Title" } },
        headers: member_headers,
        as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/books/:id (member)" do
    it "returns 403 Forbidden" do
      delete "/api/v1/books/#{any_book.id}", headers: member_headers

      expect(response).to have_http_status(:forbidden)
    end
  end

  # ── Librarian cannot borrow books ─────────────────────────────────────────────

  describe "POST /api/v1/books/:book_id/borrowings (librarian)" do
    it "returns 403 Forbidden" do
      post "/api/v1/books/#{any_book.id}/borrowings",
        headers: librarian_headers,
        as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  # ── Member cannot return borrowings ───────────────────────────────────────────

  describe "PATCH /api/v1/borrowings/:id/return (member)" do
    it "returns 403 Forbidden" do
      patch "/api/v1/borrowings/#{member1_borrowing.id}/return",
        headers: member_headers,
        as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  # ── Dashboard cross-role access ────────────────────────────────────────────────

  describe "GET /api/v1/dashboard/librarian (member)" do
    it "returns 403 Forbidden" do
      get "/api/v1/dashboard/librarian", headers: member_headers

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/v1/dashboard/member (librarian)" do
    it "returns 403 Forbidden" do
      get "/api/v1/dashboard/member", headers: librarian_headers

      expect(response).to have_http_status(:forbidden)
    end
  end

  # ── Unauthenticated access ────────────────────────────────────────────────────

  describe "unauthenticated requests" do
    it "GET /api/v1/books returns 401" do
      get "/api/v1/books"
      expect(response).to have_http_status(:unauthorized)
    end

    it "POST /api/v1/books returns 401" do
      post "/api/v1/books",
        params: { book: { title: "X", author: "X", genre: "X", isbn: "X-#{SecureRandom.hex(4)}", total_copies: 1 } },
        as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it "GET /api/v1/borrowings returns 401" do
      get "/api/v1/borrowings"
      expect(response).to have_http_status(:unauthorized)
    end

    it "GET /api/v1/dashboard/librarian returns 401" do
      get "/api/v1/dashboard/librarian"
      expect(response).to have_http_status(:unauthorized)
    end

    it "GET /api/v1/dashboard/member returns 401" do
      get "/api/v1/dashboard/member"
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
