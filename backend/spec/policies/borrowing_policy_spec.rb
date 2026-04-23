require "rails_helper"

RSpec.describe BorrowingPolicy, type: :policy do
  subject { described_class }

  let(:librarian) { build(:user, :librarian) }
  let(:member) { build(:user, :member) }
  let(:borrowing) { build(:borrowing) }

  permissions :index? do
    it { is_expected.to permit(librarian, borrowing) }
    it { is_expected.to permit(member, borrowing) }
  end

  permissions :create? do
    it { is_expected.to permit(member, borrowing) }
    it { is_expected.not_to permit(librarian, borrowing) }
  end

  permissions :return_book? do
    it { is_expected.to permit(librarian, borrowing) }
    it { is_expected.not_to permit(member, borrowing) }
  end

  describe "Scope" do
    let(:librarian_user) { create(:user, :librarian) }
    let(:member_user) { create(:user, :member) }
    let(:other_member) { create(:user, :member) }

    it "resolves all borrowings for a librarian" do
      create(:borrowing, user: member_user)
      create(:borrowing, user: other_member)
      scope = BorrowingPolicy::Scope.new(librarian_user, Borrowing.all).resolve
      expect(scope.count).to eq(Borrowing.count)
    end

    it "resolves only the member's own borrowings" do
      own_borrowing = create(:borrowing, user: member_user)
      create(:borrowing, user: other_member)
      scope = BorrowingPolicy::Scope.new(member_user, Borrowing.all).resolve
      expect(scope).to contain_exactly(own_borrowing)
    end
  end
end
