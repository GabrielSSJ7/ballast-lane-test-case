class DueTodayBorrowingsQuery
  def self.call(scope = Borrowing.all)
    scope.active.where(due_at: Date.current.all_day).includes(:user, :book)
  end
end
