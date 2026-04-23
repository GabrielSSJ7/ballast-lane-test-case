class Api::V1::Auth::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  def create
    build_resource(sign_up_params)
    resource.save
    if resource.persisted?
      warden.set_user(resource, scope: :user, store: false)
      render json: UserSerializer.new(resource).as_json, status: :created
    else
      render json: { error: "Registration failed. Please check your details." }, status: :unprocessable_entity
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:name, :email, :password)
  end
end
