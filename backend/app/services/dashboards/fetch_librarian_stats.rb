module Dashboards
  class FetchLibrarianStats
    def self.call
      new.call
    end

    def call
      overdue = OverdueBorrowingsQuery.call
      due_today = DueTodayBorrowingsQuery.call

      Result.new(
        success?: true,
        value: {
          total_books: Book.count,
          total_borrowed: Borrowing.active.count,
          due_today: due_today.count,
          members_with_overdue: overdue.select(:user_id).distinct.count
        }
      )
    end
  end
end
