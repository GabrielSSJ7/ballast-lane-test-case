require "rails_helper"

RSpec.describe User, type: :model do
  describe "validations" do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_length_of(:password).is_at_least(8) }
  end

  describe "enums" do
    it { should define_enum_for(:role).with_values(member: 0, librarian: 1) }
  end

  describe "defaults" do
    it "defaults to member role" do
      expect(build(:user).role).to eq("member")
    end
  end

  describe "#librarian?" do
    it "returns true for librarian role" do
      expect(build(:user, :librarian).librarian?).to be true
    end
  end

  describe "#member?" do
    it "returns true for member role" do
      expect(build(:user, :member).member?).to be true
    end
  end
end
