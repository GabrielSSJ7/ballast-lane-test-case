class Api::V1::DashboardController < Api::V1::BaseController
  def librarian
    authorize :dashboard, :librarian?
    result = Dashboards::FetchLibrarianStats.call
    render json: result.value
  end

  def member
    authorize :dashboard, :member?
    result = Dashboards::FetchMemberStats.call(user: current_user)
    render json: result.value
  end
end
