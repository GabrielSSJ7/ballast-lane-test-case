module AuthHelpers
  def auth_headers(user)
    post "/api/v1/auth/login",
      params: { user: { email: user.email, password: "password123" } },
      as: :json
    { "Authorization" => response.headers["Authorization"] }
  end
end
