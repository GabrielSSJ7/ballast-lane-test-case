class DashboardPolicy < ApplicationPolicy
  def librarian? = user.librarian?
  def member?    = user.member?
end
