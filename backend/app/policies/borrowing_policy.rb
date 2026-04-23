class BorrowingPolicy < ApplicationPolicy
  def create? = user.member?
  def return_book? = user.librarian?
  def index? = true

  class Scope < ApplicationPolicy::Scope
    def resolve
      user.librarian? ? @scope.all : @scope.where(user: user)
    end
  end
end
