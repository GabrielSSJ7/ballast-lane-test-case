require "rails_helper"

RSpec.describe "E2E: Auth flows", type: :request, e2e: true do
  # E2E specs rely on seeded data — no DatabaseCleaner transactions wrapping these
  let(:librarian) { User.find_by!(email: "e2e_librarian@library.com") }
  let(:member1)   { User.find_by!(email: "e2e_member1@library.com") }

  describe "POST /api/v1/auth/register" do
    context "with a fresh unique email" do
      let(:unique_email) { "e2e_register_#{SecureRandom.hex(4)}@library.com" }

      after do
        # Clean up the registered user so repeated runs don't accumulate noise
        User.find_by(email: unique_email)&.destroy
      end

      it "returns 201, issues a JWT, and the token can be used immediately" do
        post "/api/v1/auth/register",
          params: { user: { name: "E2E New User", email: unique_email, password: "password123" } },
          as: :json

        expect(response).to have_http_status(:created)

        token = response.headers["Authorization"]
        expect(token).to be_present
        expect(token).to start_with("Bearer ")

        # Subsequent authenticated request must succeed
        get "/api/v1/books", headers: { "Authorization" => token }
        expect(response).to have_http_status(:ok)
      end
    end

    context "with a duplicate email" do
      it "returns 422 with validation errors" do
        post "/api/v1/auth/register",
          params: { user: { name: "Duplicate", email: librarian.email, password: "password123" } },
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)

        body = JSON.parse(response.body)
        expect(body["error"]).to be_present
      end
    end
  end

  describe "POST /api/v1/auth/login" do
    context "with correct credentials" do
      it "returns 200 and a JWT in the Authorization header" do
        post "/api/v1/auth/login",
          params: { user: { email: member1.email, password: "password123" } },
          as: :json

        expect(response).to have_http_status(:ok)

        token = response.headers["Authorization"]
        expect(token).to be_present
        expect(token).to start_with("Bearer ")
      end
    end

    context "with wrong password" do
      it "returns 401" do
        post "/api/v1/auth/login",
          params: { user: { email: member1.email, password: "wrongpassword" } },
          as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with a non-existent email" do
      it "returns 401" do
        post "/api/v1/auth/login",
          params: { user: { email: "nobody@nowhere.com", password: "password123" } },
          as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/auth/logout" do
    it "revokes the token so subsequent requests with the old token return 401" do
      # Step 1: login and capture the token
      post "/api/v1/auth/login",
        params: { user: { email: member1.email, password: "password123" } },
        as: :json

      expect(response).to have_http_status(:ok)
      token = response.headers["Authorization"]
      expect(token).to be_present

      # Step 2: verify the token works
      get "/api/v1/books", headers: { "Authorization" => token }
      expect(response).to have_http_status(:ok)

      # Step 3: logout (revokes the JTI)
      delete "/api/v1/auth/logout", headers: { "Authorization" => token }
      expect(response).to have_http_status(:no_content)

      # Step 4: the same token must now be rejected
      get "/api/v1/books", headers: { "Authorization" => token }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
