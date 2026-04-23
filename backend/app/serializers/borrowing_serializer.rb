class BorrowingSerializer
  def initialize(borrowing, current_user: nil)
    @borrowing = borrowing
    @current_user = current_user
  end

  def as_json
    result = {
      id: @borrowing.id,
      book_id: @borrowing.book_id,
      book: BookSerializer.new(@borrowing.book).as_json,
      borrowed_at: @borrowing.borrowed_at,
      due_at: @borrowing.due_at,
      returned_at: @borrowing.returned_at,
      overdue: @borrowing.returned_at.nil? && @borrowing.due_at < Time.current
    }
    result[:user_id] = @borrowing.user_id if @current_user&.librarian?
    result
  end
end
