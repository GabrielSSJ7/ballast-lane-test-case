require "rails_helper"

RSpec.describe "E2E: Borrowings", type: :request, e2e: true do
  let(:librarian) { User.find_by!(email: "e2e_librarian@library.com") }
  let(:member1)   { User.find_by!(email: "e2e_member1@library.com") }
  let(:member2)   { User.find_by!(email: "e2e_member2@library.com") }

  let(:librarian_headers) { auth_headers(librarian) }
  let(:member1_headers)   { auth_headers(member1) }
  let(:member2_headers)   { auth_headers(member2) }

  # ── Borrow available book ──────────────────────────────────────────────────────

  describe "POST /api/v1/books/:book_id/borrowings" do
    context "when the book has available copies (E2E-001, fully available)" do
      let(:book) { Book.find_by!(isbn: "E2E-001") }

      after do
        # Return any borrowing created in this test to restore seed state
        Borrowing.active.where(book: book, user: member1).update_all(returned_at: Time.current)
      end

      it "returns 201 and decrements available_copies" do
        available_before = book.available_copies

        post "/api/v1/books/#{book.id}/borrowings",
          headers: member1_headers,
          as: :json

        expect(response).to have_http_status(:created)

        body = JSON.parse(response.body)
        expect(body["book_id"]).to eq(book.id)
        expect(body).not_to have_key("user_id")  # members don't see user_id
        expect(body["returned_at"]).to be_nil
        expect(body["borrowed_at"]).to be_present
        expect(body["due_at"]).to be_present

        # available_copies should have decreased by 1
        book.reload
        expect(book.available_copies).to eq(available_before - 1)
      end
    end

    context "when the book has 0 available copies (E2E-009, total=1, 1 active borrow)" do
      let(:book) { Book.find_by!(isbn: "E2E-009") }

      it "returns 422 with an error message" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: member1_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)

        body = JSON.parse(response.body)
        expect(body["error"]).to match(/not available/i)
      end
    end

    context "when the member already has an active borrowing for the book (E2E-008)" do
      # Seed has member1 with an active borrowing on E2E-008
      let(:book) { Book.find_by!(isbn: "E2E-008") }

      it "returns 422 with duplicate borrowing error" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: member1_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)

        body = JSON.parse(response.body)
        expect(body["error"]).to match(/already have an active borrowing/i)
      end
    end
  end

  # ── Listing borrowings ─────────────────────────────────────────────────────────

  describe "GET /api/v1/borrowings" do
    context "when the librarian requests the list" do
      it "sees all borrowings (at least the 3 seeded ones)" do
        get "/api/v1/borrowings", headers: librarian_headers
        expect(response).to have_http_status(:ok)

        borrowings = JSON.parse(response.body)
        expect(borrowings).to be_an(Array)
        expect(borrowings.length).to be >= 3

        # Confirm borrowings belong to different users
        user_ids = borrowings.map { |b| b["user_id"] }.uniq
        expect(user_ids.length).to be >= 2
      end
    end

    context "when a member requests the list" do
      it "sees only their own borrowings" do
        get "/api/v1/borrowings", headers: member2_headers
        expect(response).to have_http_status(:ok)

        borrowings = JSON.parse(response.body)
        expect(borrowings).to be_an(Array)
        expect(borrowings).not_to be_empty

        # members don't see user_id; verify scoping by checking borrowing IDs belong to member2
        borrowing_ids = borrowings.map { |b| b["id"] }
        expect(Borrowing.where(id: borrowing_ids).pluck(:user_id).uniq).to eq([member2.id])
      end
    end
  end

  # ── Return a borrowing ─────────────────────────────────────────────────────────

  describe "PATCH /api/v1/borrowings/:id/return" do
    context "when the librarian returns an active borrowing" do
      let(:book) { Book.find_by!(isbn: "E2E-003") }

      # Create a fresh borrowing via the API, then return it
      let!(:borrowing_id) do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: member2_headers,
          as: :json

        expect(response).to have_http_status(:created)
        JSON.parse(response.body)["id"]
      end

      after do
        # Ensure cleanup even if test fails mid-way
        Borrowing.find_by(id: borrowing_id)&.update(returned_at: Time.current)
      end

      it "returns 200, sets returned_at, and increments available_copies" do
        available_before = book.available_copies

        patch "/api/v1/borrowings/#{borrowing_id}/return",
          headers: librarian_headers,
          as: :json

        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)
        expect(body["returned_at"]).to be_present
        expect(body["id"]).to eq(borrowing_id)

        book.reload
        expect(book.available_copies).to eq(available_before + 1)
      end
    end

    context "when the librarian tries to return an already-returned borrowing" do
      let(:book) { Book.find_by!(isbn: "E2E-005") }

      let!(:borrowing_id) do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: member2_headers,
          as: :json

        expect(response).to have_http_status(:created)
        id = JSON.parse(response.body)["id"]

        # Return it once (should succeed)
        patch "/api/v1/borrowings/#{id}/return",
          headers: librarian_headers,
          as: :json
        expect(response).to have_http_status(:ok)

        id
      end

      it "returns 422 with an already-returned error" do
        patch "/api/v1/borrowings/#{borrowing_id}/return",
          headers: librarian_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)

        body = JSON.parse(response.body)
        expect(body["error"]).to match(/already returned/i)
      end
    end
  end
end
