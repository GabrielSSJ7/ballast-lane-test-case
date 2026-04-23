class Api::V1::DashboardController < Api::V1::BaseController
  def librarian
    raise Pundit::NotAuthorizedError unless current_user.librarian?

    result = Dashboards::FetchLibrarianStats.call
    render json: result.value
  end

  def member
    raise Pundit::NotAuthorizedError unless current_user.member?

    result = Dashboards::FetchMemberStats.call(user: current_user)
    render json: result.value
  end
end
