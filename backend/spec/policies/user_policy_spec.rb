require "rails_helper"

RSpec.describe UserPolicy do
  subject(:policy) { described_class.new(user, user) }

  let(:user) { create(:user, :member) }

  describe "permissions :me?" do
    it "permits any authenticated user" do
      expect(policy.me?).to be true
    end
  end
end
