require "rails_helper"

RSpec.describe DashboardPolicy do
  let(:librarian) { create(:user, :librarian) }
  let(:member)    { create(:user, :member) }

  describe "permissions :librarian?" do
    it "permits librarian" do
      expect(described_class.new(librarian, :dashboard).librarian?).to be true
    end

    it "denies member" do
      expect(described_class.new(member, :dashboard).librarian?).to be false
    end
  end

  describe "permissions :member?" do
    it "permits member" do
      expect(described_class.new(member, :dashboard).member?).to be true
    end

    it "denies librarian" do
      expect(described_class.new(librarian, :dashboard).member?).to be false
    end
  end
end
