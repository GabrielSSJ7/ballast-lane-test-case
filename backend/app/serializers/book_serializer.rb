class BookSerializer
  def initialize(book)
    @book = book
  end

  def as_json
    {
      id: @book.id,
      title: @book.title,
      author: @book.author,
      genre: @book.genre,
      isbn: @book.isbn,
      total_copies: @book.total_copies,
      available_copies: @book.available_copies
    }
  end
end
