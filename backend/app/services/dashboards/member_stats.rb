module Dashboards
  class MemberStats
    def self.call(user:)
      new(user: user).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      user_scope = Borrowing.where(user: @user)
      active = user_scope.active
      overdue = OverdueBorrowingsQuery.call(user_scope)

      Result.new(
        success?: true,
        value: {
          borrowed_books: active.count,
          overdue_books: overdue.count
        }
      )
    end
  end
end
