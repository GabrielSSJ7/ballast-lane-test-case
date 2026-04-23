module Books
  class Search
    def self.call(query:, page:)
      new(query:, page:).call
    end

    def initialize(query:, page:)
      @query = query
      @page = (page || 1).to_i
    end

    def call
      scope = @query.present? ? Book.search(@query) : Book.all
      scope = scope.order(:title)

      count = scope.count
      pagy = Pagy.new(count: count, page: @page, limit: Pagy::DEFAULT[:limit])
      books = scope.offset(pagy.offset).limit(pagy.limit)

      Result.new(success?: true, value: { books: books, pagy: pagy })
    end
  end
end
