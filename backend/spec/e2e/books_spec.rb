require "rails_helper"

RSpec.describe "E2E: Books", type: :request, e2e: true do
  let(:librarian) { User.find_by!(email: "e2e_librarian@library.com") }
  let(:member1)   { User.find_by!(email: "e2e_member1@library.com") }

  let(:librarian_headers) { auth_headers(librarian) }
  let(:member_headers)    { auth_headers(member1) }

  # ── CRUD ──────────────────────────────────────────────────────────────────────

  describe "POST /api/v1/books" do
    it "librarian creates a book and it appears in the book list" do
      unique_isbn = "E2E-CRUD-#{SecureRandom.hex(4)}"

      post "/api/v1/books",
        params: { book: {
          title: "E2E Created Book",
          author: "E2E Author",
          genre: "E2E Genre",
          isbn: unique_isbn,
          total_copies: 5
        } },
        headers: librarian_headers,
        as: :json

      expect(response).to have_http_status(:created)

      body = JSON.parse(response.body)
      expect(body["title"]).to eq("E2E Created Book")
      expect(body["isbn"]).to eq(unique_isbn)
      expect(body["total_copies"]).to eq(5)
      expect(body["available_copies"]).to eq(5)

      created_id = body["id"]

      # Confirm it shows up in the list
      get "/api/v1/books", headers: member_headers
      expect(response).to have_http_status(:ok)
      list_body = JSON.parse(response.body)
      ids = list_body["books"].map { |b| b["id"] }
      # May be on page 2 — search directly to confirm existence
      get "/api/v1/books?q=E2E+Created+Book", headers: member_headers
      search_body = JSON.parse(response.body)
      expect(search_body["books"].any? { |b| b["id"] == created_id }).to be true

      # Cleanup so isbn unique constraint does not pollute other tests
      Book.find(created_id).destroy
    end
  end

  describe "PATCH /api/v1/books/:id" do
    it "librarian updates a book and the change is reflected in GET /books/:id" do
      # Use a dedicated book to avoid cross-test interference
      unique_isbn = "E2E-UPD-#{SecureRandom.hex(4)}"
      post "/api/v1/books",
        params: { book: {
          title: "E2E Book To Update",
          author: "Original Author",
          genre: "Original Genre",
          isbn: unique_isbn,
          total_copies: 2
        } },
        headers: librarian_headers,
        as: :json

      book_id = JSON.parse(response.body)["id"]

      patch "/api/v1/books/#{book_id}",
        params: { book: { title: "E2E Updated Title", total_copies: 10 } },
        headers: librarian_headers,
        as: :json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["title"]).to eq("E2E Updated Title")
      expect(body["total_copies"]).to eq(10)

      # Confirm via GET
      get "/api/v1/books/#{book_id}", headers: member_headers
      expect(response).to have_http_status(:ok)
      get_body = JSON.parse(response.body)
      expect(get_body["title"]).to eq("E2E Updated Title")
      expect(get_body["total_copies"]).to eq(10)

      # Cleanup
      Book.find(book_id).destroy
    end
  end

  describe "DELETE /api/v1/books/:id" do
    it "librarian deletes a book with no active borrowings and it is gone from the list" do
      unique_isbn = "E2E-DEL-#{SecureRandom.hex(4)}"
      post "/api/v1/books",
        params: { book: {
          title: "E2E Book To Delete",
          author: "Delete Author",
          genre: "Delete Genre",
          isbn: unique_isbn,
          total_copies: 1
        } },
        headers: librarian_headers,
        as: :json

      expect(response).to have_http_status(:created)
      book_id = JSON.parse(response.body)["id"]

      delete "/api/v1/books/#{book_id}", headers: librarian_headers

      expect(response).to have_http_status(:no_content)

      # Confirm it is gone
      get "/api/v1/books/#{book_id}", headers: member_headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ── Search ─────────────────────────────────────────────────────────────────────

  describe "GET /api/v1/books?q=..." do
    context "searching by title fragment" do
      it "returns only matching books" do
        # Search by exact title — "E2E Book One" is unique in seeds
        get "/api/v1/books?q=E2E+Book+One", headers: member_headers
        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)
        books = body["books"]
        expect(books.any? { |b| b["isbn"] == "E2E-001" }).to be true
        expect(books.any? { |b| b["title"] == "E2E Book One" }).to be true
      end
    end

    context "searching by author" do
      it "returns all books whose author matches" do
        # E2E-002 and E2E-004 both have genre Science; Author Two is unique
        get "/api/v1/books?q=Author+Two", headers: member_headers
        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)
        books = body["books"]
        expect(books.length).to eq(1)
        expect(books.first["author"]).to eq("Author Two")
      end
    end

    context "searching by genre" do
      it "returns all books whose genre matches" do
        # E2E-002 and E2E-004 both have genre "Science"
        get "/api/v1/books?q=Science", headers: member_headers
        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)
        books = body["books"]
        isbns = books.map { |b| b["isbn"] }
        expect(isbns).to include("E2E-002", "E2E-004")
        expect(books.all? { |b| b["genre"] == "Science" }).to be true
      end
    end

    context "searching with no matches" do
      it "returns an empty books array" do
        get "/api/v1/books?q=ZZZ_NO_MATCH_XYZ", headers: member_headers
        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)
        expect(body["books"]).to be_empty
      end
    end
  end

  # ── Pagination ─────────────────────────────────────────────────────────────────

  describe "GET /api/v1/books (pagination)" do
    it "page 1 and page 2 return non-overlapping sets when 25 books exist" do
      # Seed has exactly 25 books; default per_page is 20
      get "/api/v1/books?page=1", headers: member_headers
      expect(response).to have_http_status(:ok)
      page1_body = JSON.parse(response.body)
      page1_ids = page1_body["books"].map { |b| b["id"] }

      meta = page1_body["meta"]
      expect(meta["current_page"]).to eq(1)
      expect(meta["total_count"]).to be >= 25
      expect(meta["per_page"]).to eq(20)
      expect(page1_ids.length).to eq(20)

      get "/api/v1/books?page=2", headers: member_headers
      expect(response).to have_http_status(:ok)
      page2_body = JSON.parse(response.body)
      page2_ids = page2_body["books"].map { |b| b["id"] }

      expect(page2_ids).not_to be_empty
      expect((page1_ids & page2_ids)).to be_empty, "Pages should not share any book IDs"

      page2_meta = page2_body["meta"]
      expect(page2_meta["current_page"]).to eq(2)
    end

    it "returns meta with total_pages, total_count, per_page, current_page" do
      get "/api/v1/books", headers: member_headers
      expect(response).to have_http_status(:ok)

      meta = JSON.parse(response.body)["meta"]
      expect(meta).to include("total_pages", "total_count", "per_page", "current_page")
      expect(meta["per_page"]).to eq(20)
      expect(meta["total_pages"]).to be >= 2
    end
  end
end
