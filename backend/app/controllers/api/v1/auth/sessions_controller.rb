class Api::V1::Auth::SessionsController < Devise::SessionsController
  respond_to :json

  private

  def respond_with(resource, _opts = {})
    render json: UserSerializer.new(resource).as_json, status: :ok
  end

  def respond_to_on_destroy(*)
    head :no_content
  end
end
