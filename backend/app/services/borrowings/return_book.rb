module Borrowings
  class ReturnBook
    def self.call(borrowing:)
      new(borrowing: borrowing).call
    end

    def initialize(borrowing:)
      @borrowing = borrowing
    end

    def call
      if @borrowing.returned_at.present?
        return Result.new(success?: false, error: "Already returned")
      end

      if @borrowing.update(returned_at: Time.current)
        Result.new(success?: true, value: @borrowing)
      else
        Result.new(success?: false, error: @borrowing.errors.full_messages.join(", "))
      end
    end
  end
end
