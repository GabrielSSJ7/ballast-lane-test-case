class Rack::Attack
  throttle("logins/ip", limit: 5, period: 60) do |req|
    req.ip if req.path == "/api/v1/auth/login" && req.post?
  end

  throttle("logins/email", limit: 10, period: 300) do |req|
    if req.path == "/api/v1/auth/login" && req.post?
      req.params.dig("user", "email")&.downcase&.strip
    end
  end

  throttle("registrations/ip", limit: 3, period: 300) do |req|
    req.ip if req.path == "/api/v1/auth/register" && req.post?
  end
end
