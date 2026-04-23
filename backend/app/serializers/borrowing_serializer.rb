class BorrowingSerializer
  def initialize(borrowing)
    @borrowing = borrowing
  end

  def as_json
    {
      id: @borrowing.id,
      user_id: @borrowing.user_id,
      book_id: @borrowing.book_id,
      book: BookSerializer.new(@borrowing.book).as_json,
      borrowed_at: @borrowing.borrowed_at,
      due_at: @borrowing.due_at,
      returned_at: @borrowing.returned_at,
      overdue: @borrowing.returned_at.nil? && @borrowing.due_at < Time.current
    }
  end
end
