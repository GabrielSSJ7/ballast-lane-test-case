FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    email { Faker::Internet.unique.email }
    password { "password123" }
    role { :member }

    trait :librarian do
      role { :librarian }
    end

    trait :member do
      role { :member }
    end
  end
end
