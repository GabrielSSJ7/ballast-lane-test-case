require "rails_helper"

RSpec.describe "Auth Sessions", type: :request do
  let(:user) { create(:user, email: "user@example.com", password: "password123") }

  describe "POST /api/v1/auth/login" do
    it "returns 200 and JWT on valid credentials" do
      post "/api/v1/auth/login",
        params: { user: { email: user.email, password: "password123" } },
        as: :json
      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to be_present
      expect(response.headers["Authorization"]).to start_with("Bearer ")
    end

    it "returns user data in body" do
      post "/api/v1/auth/login",
        params: { user: { email: user.email, password: "password123" } },
        as: :json
      body = JSON.parse(response.body)
      expect(body["email"]).to eq(user.email)
      expect(body["role"]).to eq("member")
    end

    it "returns 401 on wrong password" do
      post "/api/v1/auth/login",
        params: { user: { email: user.email, password: "wrongpassword" } },
        as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 on unknown email" do
      post "/api/v1/auth/login",
        params: { user: { email: "unknown@example.com", password: "password123" } },
        as: :json
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE /api/v1/auth/logout" do
    it "returns 204 and revokes the token" do
      headers = auth_headers(user)
      delete "/api/v1/auth/logout", headers: headers
      expect(response).to have_http_status(:no_content)
    end

    it "denies access with the revoked token" do
      headers = auth_headers(user)
      delete "/api/v1/auth/logout", headers: headers

      get "/api/v1/books", headers: headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 204 without authentication (idempotent logout)" do
      delete "/api/v1/auth/logout"
      expect(response).to have_http_status(:no_content)
    end
  end
end
