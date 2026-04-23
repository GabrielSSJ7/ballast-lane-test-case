require "rails_helper"

RSpec.describe Borrowings::Create do
  let(:member) { create(:user, :member) }
  let(:book) { create(:book, total_copies: 3) }

  describe ".call" do
    it "creates a borrowing and returns success" do
      result = described_class.call(book: book, user: member)
      expect(result.success?).to be true
      expect(result.value).to be_a(Borrowing)
      expect(result.value.user).to eq(member)
      expect(result.value.book).to eq(book)
    end

    it "sets due_at to 2 weeks from borrowed_at" do
      result = described_class.call(book: book, user: member)
      expect(result.value.due_at).to be_within(1.second).of(result.value.borrowed_at + 2.weeks)
    end

    context "when book has no available copies" do
      before do
        users = create_list(:user, 3)
        users.each { |u| create(:borrowing, user: u, book: book) }
      end

      it "returns failure with error message" do
        result = described_class.call(book: book, user: member)
        expect(result.success?).to be false
        expect(result.error).to eq("Book is not available")
      end
    end

    context "when book has total_copies 0" do
      before { book.update!(total_copies: 0) }

      it "returns failure" do
        result = described_class.call(book: book, user: member)
        expect(result.success?).to be false
        expect(result.error).to eq("Book is not available")
      end
    end

    context "when user already has active borrowing for same book" do
      before { create(:borrowing, user: member, book: book) }

      it "returns failure with duplicate error" do
        result = described_class.call(book: book, user: member)
        expect(result.success?).to be false
        expect(result.error).to eq("You already have an active borrowing for this book")
      end
    end

    context "when user has returned the book and wants to borrow again" do
      before { create(:borrowing, :returned, user: member, book: book) }

      it "allows borrowing again" do
        result = described_class.call(book: book, user: member)
        expect(result.success?).to be true
      end
    end
  end
end
