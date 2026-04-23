require "rails_helper"

RSpec.describe BookPolicy, type: :policy do
  let(:librarian) { build(:user, :librarian) }
  let(:member) { build(:user, :member) }
  let(:book) { build(:book) }

  describe "librarian permissions" do
    subject { described_class.new(librarian, book) }

    it { should permit_action(:index) }
    it { should permit_action(:show) }
    it { should permit_action(:create) }
    it { should permit_action(:update) }
    it { should permit_action(:destroy) }
  end

  describe "member permissions" do
    subject { described_class.new(member, book) }

    it { should permit_action(:index) }
    it { should permit_action(:show) }
    it { should_not permit_action(:create) }
    it { should_not permit_action(:update) }
    it { should_not permit_action(:destroy) }
  end
end
