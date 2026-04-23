require "rails_helper"

RSpec.describe "GET /api/v1/users/me", type: :request do
  let(:member)    { create(:user, :member) }
  let(:librarian) { create(:user, :librarian) }

  it "returns 200 and current user data for member" do
    get "/api/v1/users/me", headers: auth_headers(member)
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["id"]).to eq(member.id)
    expect(body["email"]).to eq(member.email)
    expect(body["role"]).to eq("member")
  end

  it "returns 200 and current user data for librarian" do
    get "/api/v1/users/me", headers: auth_headers(librarian)
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["role"]).to eq("librarian")
  end

  it "returns 401 without authentication" do
    get "/api/v1/users/me"
    expect(response).to have_http_status(:unauthorized)
  end

  it "does not expose encrypted_password" do
    get "/api/v1/users/me", headers: auth_headers(member)
    expect(response.body).not_to include("encrypted_password")
  end
end
