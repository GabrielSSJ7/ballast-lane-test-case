require "rails_helper"

RSpec.describe "Borrowings API", type: :request do
  let(:librarian) { create(:user, :librarian) }
  let(:member) { create(:user, :member) }
  let(:book) { create(:book, total_copies: 3) }

  describe "POST /api/v1/books/:book_id/borrowings" do
    context "as member" do
      it "returns 201 and creates borrowing" do
        expect {
          post "/api/v1/books/#{book.id}/borrowings",
            headers: auth_headers(member),
            as: :json
        }.to change(Borrowing, :count).by(1)
        expect(response).to have_http_status(:created)
      end

      it "returns borrowing data with book details" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: auth_headers(member),
          as: :json
        body = JSON.parse(response.body)
        expect(body["book_id"]).to eq(book.id)
        expect(body).not_to have_key("user_id")  # members don't see user_id
        expect(body["returned_at"]).to be_nil
        expect(body["due_at"]).to be_present
        expect(body["book"]).to be_present
        expect(body["book"]["id"]).to eq(book.id)
      end

      it "sets due_at to 2 weeks from now" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: auth_headers(member),
          as: :json
        body = JSON.parse(response.body)
        due_at = Time.parse(body["due_at"])
        expect(due_at).to be_within(1.minute).of(2.weeks.from_now)
      end
    end

    context "as librarian" do
      it "returns 403" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: auth_headers(librarian),
          as: :json
        expect(response).to have_http_status(:forbidden)
      end
    end

    context "when book is unavailable" do
      before { book.update!(total_copies: 0) }

      it "returns 422 with error message" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: auth_headers(member),
          as: :json
        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["error"]).to eq("Book is not available")
      end
    end

    context "when all copies are borrowed" do
      before do
        users = create_list(:user, 3)
        users.each { |u| create(:borrowing, user: u, book: book) }
        book.update!(total_copies: 3)
      end

      it "returns 422" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: auth_headers(member),
          as: :json
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context "when member has duplicate active borrowing" do
      before { create(:borrowing, user: member, book: book) }

      it "returns 422 with duplicate error" do
        post "/api/v1/books/#{book.id}/borrowings",
          headers: auth_headers(member),
          as: :json
        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["error"]).to eq("You already have an active borrowing for this book")
      end
    end
  end

  describe "PATCH /api/v1/borrowings/:id/return" do
    let(:borrowing) { create(:borrowing, user: member, book: book) }

    context "as librarian" do
      it "returns 200 and marks as returned" do
        patch "/api/v1/borrowings/#{borrowing.id}/return",
          headers: auth_headers(librarian)
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["returned_at"]).to be_present
        expect(borrowing.reload.returned_at).to be_present
      end
    end

    context "as member" do
      it "returns 403" do
        patch "/api/v1/borrowings/#{borrowing.id}/return",
          headers: auth_headers(member)
        expect(response).to have_http_status(:forbidden)
      end
    end

    context "when already returned" do
      let(:borrowing) { create(:borrowing, :returned, user: member, book: book) }

      it "returns 422" do
        patch "/api/v1/borrowings/#{borrowing.id}/return",
          headers: auth_headers(librarian)
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "GET /api/v1/borrowings" do
    let(:member2) { create(:user, :member) }
    let(:book2) { create(:book) }
    let!(:borrowing_member) { create(:borrowing, user: member, book: book) }
    let!(:borrowing_member2) { create(:borrowing, user: member2, book: book2) }

    context "as librarian" do
      it "returns all borrowings" do
        get "/api/v1/borrowings", headers: auth_headers(librarian)
        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body).map { |b| b["id"] }
        expect(ids).to include(borrowing_member.id, borrowing_member2.id)
      end
    end

    context "as member" do
      it "returns only own borrowings" do
        get "/api/v1/borrowings", headers: auth_headers(member)
        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body).map { |b| b["id"] }
        expect(ids).to include(borrowing_member.id)
        expect(ids).not_to include(borrowing_member2.id)
      end

      it "includes book details in response" do
        get "/api/v1/borrowings", headers: auth_headers(member)
        body = JSON.parse(response.body)
        expect(body.first["book"]).to be_present
        expect(body.first["book"]["title"]).to be_present
      end
    end

    context "librarian viewing a borrowing" do
      it "includes user_id in the response" do
        borrowing = create(:borrowing, user: member, book: book)
        get "/api/v1/borrowings", headers: auth_headers(librarian)
        body = JSON.parse(response.body)
        expect(body.first["user_id"]).to eq(member.id)
      end
    end
  end
end
