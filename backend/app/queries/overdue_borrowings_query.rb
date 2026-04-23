class OverdueBorrowingsQuery
  def self.call(scope = Borrowing.all)
    scope.active.where("due_at < ?", Time.current).includes(:user, :book)
  end
end
