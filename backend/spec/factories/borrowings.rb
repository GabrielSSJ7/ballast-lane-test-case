FactoryBot.define do
  factory :borrowing do
    association :user
    association :book
    borrowed_at { Time.current }
    due_at { 2.weeks.from_now }
    returned_at { nil }

    trait :returned do
      returned_at { Time.current }
    end

    trait :overdue do
      borrowed_at { 3.weeks.ago }
      due_at { 1.week.ago }
    end

    trait :due_today do
      borrowed_at { 2.weeks.ago }
      due_at { Date.current.end_of_day }
    end
  end
end
