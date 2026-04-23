class Api::V1::BooksController < Api::V1::BaseController
  before_action :set_book, only: [:show, :update, :destroy]

  def index
    authorize Book
    result = Books::Search.call(query: params[:q], page: params[:page])
    books = result.value[:books]
    pagy = result.value[:pagy]
    render json: {
      books: books.map { |b| BookSerializer.new(b).as_json },
      meta: {
        current_page: pagy.page,
        total_pages: pagy.pages,
        total_count: pagy.count,
        per_page: pagy.limit
      }
    }
  end

  def show
    authorize @book
    render json: BookSerializer.new(@book).as_json
  end

  def create
    authorize Book
    book = Book.new(book_params)
    if book.save
      render json: BookSerializer.new(book).as_json, status: :created
    else
      render json: { errors: book.errors }, status: :unprocessable_entity
    end
  end

  def update
    authorize @book
    if @book.update(book_params)
      render json: BookSerializer.new(@book).as_json
    else
      render json: { errors: @book.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @book
    if @book.borrowings.active.exists?
      render json: { error: "Cannot delete book with active borrowings" }, status: :unprocessable_entity
    else
      @book.destroy
      head :no_content
    end
  end

  private

  def set_book
    @book = Book.find(params[:id])
  end

  def book_params
    params.require(:book).permit(:title, :author, :genre, :isbn, :total_copies)
  end
end
