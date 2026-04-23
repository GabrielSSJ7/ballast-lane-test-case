require "rails_helper"

RSpec.describe Books::Search do
  describe ".call" do
    let!(:ruby_book) { create(:book, title: "Ruby Programming", author: "Matz", genre: "Tech") }
    let!(:python_book) { create(:book, title: "Python Guide", author: "Alice", genre: "Tech") }

    context "with no query" do
      it "returns all books" do
        result = described_class.call(query: nil, page: 1)
        expect(result.success?).to be true
        expect(result.value[:books]).to include(ruby_book, python_book)
      end
    end

    context "with query" do
      it "filters by title (case-insensitive)" do
        result = described_class.call(query: "ruby", page: 1)
        expect(result.value[:books]).to include(ruby_book)
        expect(result.value[:books]).not_to include(python_book)
      end

      it "filters by author (case-insensitive)" do
        result = described_class.call(query: "ALICE", page: 1)
        expect(result.value[:books]).to include(python_book)
      end

      it "filters by genre" do
        result = described_class.call(query: "tech", page: 1)
        expect(result.value[:books]).to include(ruby_book, python_book)
      end
    end

    context "pagination" do
      before { create_list(:book, 25) }

      it "returns pagy metadata" do
        result = described_class.call(query: nil, page: 1)
        expect(result.value[:pagy]).to be_a(Pagy)
      end

      it "limits to 20 books per page" do
        result = described_class.call(query: nil, page: 1)
        expect(result.value[:books].count).to eq(20)
      end

      it "returns correct page 2" do
        result = described_class.call(query: nil, page: 2)
        expect(result.value[:books].count).to be > 0
      end
    end
  end
end
