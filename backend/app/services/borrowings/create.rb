module Borrowings
  class Create
    def self.call(book:, user:)
      new(book: book, user: user).call
    end

    def initialize(book:, user:)
      @book = book
      @user = user
    end

    def call
      ActiveRecord::Base.transaction do
        book = Book.lock.find(@book.id)
        return Result.new(success?: false, error: "Book is not available") if book.available_copies <= 0
        return Result.new(success?: false, error: "You already have an active borrowing for this book") if duplicate_borrowing?

        borrowing = book.borrowings.build(user: @user)
        if borrowing.save
          Result.new(success?: true, value: borrowing)
        else
          Result.new(success?: false, error: borrowing.errors.full_messages.join(", "))
        end
      end
    end

    private

    def duplicate_borrowing?
      Borrowing.active.exists?(user: @user, book: @book)
    end
  end
end
