class Api::V1::BaseController < ActionController::API
  include Pundit::Authorization

  before_action :authenticate_user!
  after_action :verify_authorized, unless: :skip_pundit_verify?

  rescue_from Pundit::NotAuthorizedError, with: :render_forbidden
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable

  private

  def skip_pundit_verify?
    current_user.nil? || @_pundit_skipped
  end

  def render_forbidden
    @_pundit_skipped = true
    render json: { error: "Forbidden" }, status: :forbidden
  end

  def render_not_found
    @_pundit_skipped = true
    render json: { error: "Not found" }, status: :not_found
  end

  def render_unprocessable(exception)
    @_pundit_skipped = true
    render json: { errors: exception.record.errors }, status: :unprocessable_entity
  end
end
