require "rails_helper"

RSpec.describe Borrowing, type: :model do
  describe "associations" do
    it { should belong_to(:user) }
    it { should belong_to(:book) }
  end

  describe "validations" do
    it { should validate_presence_of(:borrowed_at) }
    it { should validate_presence_of(:due_at) }
  end

  describe "defaults" do
    it "sets borrowed_at on create" do
      borrowing = create(:borrowing)
      expect(borrowing.borrowed_at).to be_present
    end

    it "sets due_at to 2 weeks after borrowed_at" do
      borrowing = create(:borrowing)
      expect(borrowing.due_at).to be_within(1.second).of(borrowing.borrowed_at + 2.weeks)
    end
  end

  describe "scopes" do
    describe ".active" do
      it "includes borrowings without returned_at" do
        active = create(:borrowing)
        create(:borrowing, returned_at: Time.current)
        expect(Borrowing.active).to contain_exactly(active)
      end
    end

    describe ".overdue" do
      it "includes active borrowings past due_at" do
        overdue = create(:borrowing, borrowed_at: 3.weeks.ago, due_at: 1.week.ago)
        create(:borrowing)
        expect(Borrowing.overdue).to contain_exactly(overdue)
      end
    end

    describe ".due_today" do
      it "includes active borrowings due today" do
        due_today = create(:borrowing, borrowed_at: 2.weeks.ago, due_at: Date.current.end_of_day)
        create(:borrowing)
        expect(Borrowing.due_today).to contain_exactly(due_today)
      end
    end
  end
end
