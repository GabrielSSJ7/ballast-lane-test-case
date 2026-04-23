require "rails_helper"

RSpec.describe BookPolicy, type: :policy do
  subject { described_class }

  let(:librarian) { build(:user, :librarian) }
  let(:member) { build(:user, :member) }
  let(:book) { build(:book) }

  permissions :index?, :show? do
    it { is_expected.to permit(librarian, book) }
    it { is_expected.to permit(member, book) }
  end

  permissions :create?, :update?, :destroy? do
    it { is_expected.to permit(librarian, book) }
    it { is_expected.not_to permit(member, book) }
  end

  describe "Scope" do
    let(:user) { create(:user, :member) }

    it "resolves all books" do
      create_list(:book, 3)
      scope = BookPolicy::Scope.new(user, Book.all).resolve
      expect(scope.count).to eq(Book.count)
    end
  end
end
