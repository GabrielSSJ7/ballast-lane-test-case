require "rails_helper"
require "rake"

RSpec.describe "jwt:cleanup task" do
  before(:all) do
    Rails.application.load_tasks
  end

  it "deletes expired denylist entries and leaves active ones" do
    expired = JwtDenylist.create!(jti: SecureRandom.uuid, exp: 1.hour.ago)
    active  = JwtDenylist.create!(jti: SecureRandom.uuid, exp: 1.hour.from_now)

    Rake::Task["jwt:cleanup"].execute

    expect(JwtDenylist.exists?(expired.id)).to be false
    expect(JwtDenylist.exists?(active.id)).to be true
  end
end
