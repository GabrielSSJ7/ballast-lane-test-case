class Api::V1::BorrowingsController < Api::V1::BaseController
  def index
    authorize Borrowing
    borrowings = policy_scope(Borrowing)
      .includes(:user, book: :borrowings)
      .order(created_at: :desc)
    render json: borrowings.map { |b| BorrowingSerializer.new(b, current_user: current_user).as_json }
  end

  def create
    book = Book.find(params[:book_id])
    authorize Borrowing
    result = Borrowings::Create.call(book: book, user: current_user)
    if result.success?
      render json: BorrowingSerializer.new(result.value, current_user: current_user).as_json, status: :created
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  def return_book
    borrowing = Borrowing.find(params[:id])
    authorize borrowing, :return_book?
    result = Borrowings::ReturnBook.call(borrowing: borrowing)
    if result.success?
      render json: BorrowingSerializer.new(result.value, current_user: current_user).as_json
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end
end
