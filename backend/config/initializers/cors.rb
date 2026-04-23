Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    allowed_origins = if Rails.env.production?
      ENV.fetch("ALLOWED_ORIGINS").split(",")
    else
      ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174,http://localhost:3001").split(",")
    end

    origins allowed_origins

    resource "*",
      headers: %w[Authorization Content-Type Accept],
      methods: [:get, :post, :patch, :delete, :options, :head],
      expose: ["Authorization"],
      credentials: true
  end
end
