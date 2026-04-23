require "rails_helper"

RSpec.describe "Books API", type: :request do
  let(:librarian) { create(:user, :librarian) }
  let(:member) { create(:user, :member) }

  describe "GET /api/v1/books" do
    before { create_list(:book, 25) }

    it "returns 20 books per page for authenticated user" do
      get "/api/v1/books", headers: auth_headers(member)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["books"].length).to eq(20)
    end

    it "returns pagination metadata" do
      get "/api/v1/books", headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["meta"]).to include(
        "current_page" => 1,
        "total_pages" => 2,
        "total_count" => 25,
        "per_page" => 20
      )
    end

    it "filters by search query on title" do
      create(:book, title: "Unique Title XYZ123")
      get "/api/v1/books", params: { q: "XYZ123" }, headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["books"].any? { |b| b["title"] == "Unique Title XYZ123" }).to be true
    end

    it "filters by search query on author" do
      create(:book, author: "UniqueAuthorABC")
      get "/api/v1/books", params: { q: "uniqueauthorabc" }, headers: auth_headers(member)
      body = JSON.parse(response.body)
      expect(body["books"].any? { |b| b["author"] == "UniqueAuthorABC" }).to be true
    end

    it "returns 401 without authentication" do
      get "/api/v1/books"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns book with available_copies field" do
      book = create(:book, total_copies: 5)
      get "/api/v1/books", headers: auth_headers(member)
      body = JSON.parse(response.body)
      found = body["books"].find { |b| b["id"] == book.id }
      expect(found).to include("available_copies", "total_copies")
    end
  end

  describe "GET /api/v1/books/:id" do
    let(:book) { create(:book) }

    it "returns the book" do
      get "/api/v1/books/#{book.id}", headers: auth_headers(member)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["id"]).to eq(book.id)
      expect(body["title"]).to eq(book.title)
    end

    it "returns 404 for nonexistent book" do
      get "/api/v1/books/999999", headers: auth_headers(member)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/books" do
    let(:valid_params) do
      { book: { title: "New Book", author: "Author", genre: "Fiction", isbn: "978-1234567890", total_copies: 2 } }
    end

    it "returns 201 and creates book as librarian" do
      expect {
        post "/api/v1/books", params: valid_params, headers: auth_headers(librarian), as: :json
      }.to change(Book, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 403 as member" do
      post "/api/v1/books", params: valid_params, headers: auth_headers(member), as: :json
      expect(response).to have_http_status(:forbidden)
    end

    it "returns 422 with invalid params (missing title)" do
      post "/api/v1/books",
        params: { book: { author: "A", genre: "G", isbn: "111", total_copies: 1 } },
        headers: auth_headers(librarian),
        as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)
      expect(body).to have_key("errors")
    end

    it "returns 422 with duplicate isbn" do
      create(:book, isbn: "978-1234567890")
      post "/api/v1/books", params: valid_params, headers: auth_headers(librarian), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/books/:id" do
    let(:book) { create(:book) }

    it "returns 200 and updates book as librarian" do
      patch "/api/v1/books/#{book.id}",
        params: { book: { title: "Updated Title" } },
        headers: auth_headers(librarian),
        as: :json
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["title"]).to eq("Updated Title")
    end

    it "returns 403 as member" do
      patch "/api/v1/books/#{book.id}",
        params: { book: { title: "Hacked" } },
        headers: auth_headers(member),
        as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/books/:id" do
    let!(:book) { create(:book) }

    it "returns 204 and deletes book as librarian" do
      expect {
        delete "/api/v1/books/#{book.id}", headers: auth_headers(librarian)
      }.to change(Book, :count).by(-1)
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
      body = JSON.parse(response.body)
      expect(body["error"]).to be_present
    end
  end
end
