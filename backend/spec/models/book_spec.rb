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
    let!(:ruby_book) { create(:book, title: "Ruby on Rails", author: "DHH", genre: "Tech") }
    let!(:python_book) { create(:book, title: "Python Guide", author: "Alice", genre: "Tech") }

    it "finds by title" do
      expect(Book.search("ruby")).to include(ruby_book)
      expect(Book.search("ruby")).not_to include(python_book)
    end

    it "finds by author" do
      expect(Book.search("alice")).to include(python_book)
    end

    it "finds by genre" do
      expect(Book.search("tech")).to include(ruby_book, python_book)
    end

    it "is case-insensitive" do
      expect(Book.search("RUBY")).to include(ruby_book)
    end
  end
end
