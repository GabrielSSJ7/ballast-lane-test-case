class Api::V1::Auth::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  def create
    build_resource(sign_up_params)
    resource.save
    if resource.persisted?
      sign_in(resource)
      render json: UserSerializer.new(resource).as_json, status: :created
    else
      render json: { errors: resource.errors }, status: :unprocessable_entity
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:name, :email, :password)
  end
end
