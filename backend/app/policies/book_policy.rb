class BookPolicy < ApplicationPolicy
  def index? = true
  def show? = true
  def create? = user.librarian?
  def update? = user.librarian?
  def destroy? = user.librarian?

  class Scope < ApplicationPolicy::Scope
    def resolve
      @scope.all
    end
  end
end
