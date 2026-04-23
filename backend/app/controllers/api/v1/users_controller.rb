class Api::V1::UsersController < Api::V1::BaseController
  def me
    authorize current_user, :me?
    render json: UserSerializer.new(current_user).as_json
  end
end
