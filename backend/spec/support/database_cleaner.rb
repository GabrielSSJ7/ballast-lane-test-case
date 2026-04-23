DatabaseCleaner.allow_remote_database_url = true

RSpec.configure do |config|
  config.before(:suite) do
    DatabaseCleaner.strategy = :truncation
    DatabaseCleaner.clean_with(:truncation)
  end

  # Load fresh seed data before each e2e spec file's context
  config.before(:context, :e2e) do
    DatabaseCleaner.clean_with(:truncation)
    load Rails.root.join("db/seeds/e2e.rb")
  end

  config.around(:each) do |example|
    if example.metadata[:e2e]
      example.run
    else
      # Truncate before AND after: ensures a clean slate even when e2e seeds
      # were committed by a preceding context (truncation strategy only cleans
      # after the block, not before).
      DatabaseCleaner.clean
      DatabaseCleaner.cleaning { example.run }
    end
  end
end
