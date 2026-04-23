require "rails_helper"

RSpec.describe "POST /api/v1/auth/register", type: :request do
  let(:valid_params) do
    {
      user: {
        name: "Alice",
        email: "alice@example.com",
        password: "password123"
      }
    }
  end

  context "with valid params" do
    it "returns 201 and JWT in Authorization header" do
      post "/api/v1/auth/register", params: valid_params, as: :json
      expect(response).to have_http_status(:created)
      expect(response.headers["Authorization"]).to be_present
      expect(response.headers["Authorization"]).to start_with("Bearer ")
    end

    it "creates the user in the database" do
      expect {
        post "/api/v1/auth/register", params: valid_params, as: :json
      }.to change(User, :count).by(1)
    end

    it "returns user data in body" do
      post "/api/v1/auth/register", params: valid_params, as: :json
      body = JSON.parse(response.body)
      expect(body["email"]).to eq("alice@example.com")
      expect(body["role"]).to eq("member")
      expect(body).not_to have_key("encrypted_password")
    end

    it "defaults role to member" do
      post "/api/v1/auth/register", params: valid_params, as: :json
      body = JSON.parse(response.body)
      expect(body["role"]).to eq("member")
    end
  end

  context "with invalid params" do
    it "returns 422 when password is too short" do
      post "/api/v1/auth/register",
        params: { user: { email: "a@a.com", password: "short" } },
        as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when email is already taken" do
      create(:user, email: "alice@example.com")
      post "/api/v1/auth/register", params: valid_params, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when email is missing" do
      post "/api/v1/auth/register",
        params: { user: { password: "password123" } },
        as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "does not expose password in error response" do
      post "/api/v1/auth/register",
        params: { user: { email: "bad", password: "short" } },
        as: :json
      body = response.body
      expect(body).not_to include("password123")
    end
  end
end
