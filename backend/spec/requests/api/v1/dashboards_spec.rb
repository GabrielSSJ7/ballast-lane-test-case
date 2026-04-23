require "rails_helper"

RSpec.describe "Dashboards API", type: :request do
  let(:librarian) { create(:user, :librarian) }
  let(:member) { create(:user, :member) }

  describe "GET /api/v1/dashboard/librarian" do
    before do
      books = create_list(:book, 3, total_copies: 5)
      create(:borrowing, book: books[0], user: create(:user, :member))
      create(:borrowing, :overdue, book: books[1], user: create(:user, :member))
    end

    it "returns 200 with correct keys for librarian" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(librarian)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.keys).to match_array(%w[total_books total_borrowed due_today members_with_overdue])
    end

    it "returns correct total_books count" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(librarian)
      body = JSON.parse(response.body)
      expect(body["total_books"]).to eq(Book.count)
    end

    it "returns correct total_borrowed (active borrowings)" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(librarian)
      body = JSON.parse(response.body)
      expect(body["total_borrowed"]).to eq(Borrowing.active.count)
    end

    it "returns members_with_overdue count" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(librarian)
      body = JSON.parse(response.body)
      expect(body["members_with_overdue"]).to be >= 1
    end

    it "returns 403 for member" do
      get "/api/v1/dashboard/librarian", headers: auth_headers(member)
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 401 without auth" do
      get "/api/v1/dashboard/librarian"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/dashboard/member" do
    before do
      book1 = create(:book, total_copies: 5)
      book2 = create(:book, total_copies: 5)
      create(:borrowing, user: member, book: book1)
      create(:borrowing, :overdue, user: member, book: book2)
    end

    it "returns 200 with correct keys for member" do
      get "/api/v1/dashboard/member", headers: auth_headers(member)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.keys).to match_array(%w[borrowed_books overdue_books])
    end

    it "returns correct borrowed_books count (active only)" do
      get "/api/v1/dashboard/member", headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["borrowed_books"]).to eq(2)
    end

    it "returns correct overdue_books count" do
      get "/api/v1/dashboard/member", headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["overdue_books"]).to eq(1)
    end

    it "returns 403 for librarian" do
      get "/api/v1/dashboard/member", headers: auth_headers(librarian)
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 401 without auth" do
      get "/api/v1/dashboard/member"
      expect(response).to have_http_status(:unauthorized)
    end

    it "only counts the member's own borrowings, not others" do
      other_member = create(:user, :member)
      create(:borrowing, user: other_member, book: create(:book, total_copies: 5))
      get "/api/v1/dashboard/member", headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["borrowed_books"]).to eq(2)
    end
  end
end
