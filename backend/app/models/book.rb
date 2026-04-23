class Book < ApplicationRecord
  has_many :borrowings, dependent: :destroy

  validates :title, :author, :genre, presence: true
  validates :isbn, presence: true, uniqueness: true
  validates :total_copies, numericality: { greater_than_or_equal_to: 0 }

  scope :search, ->(query) {
    where("title ILIKE :q OR author ILIKE :q OR genre ILIKE :q", q: "%#{sanitize_sql_like(query)}%")
  }

  def available_copies
    if borrowings.loaded?
      total_copies - borrowings.count { |b| b.returned_at.nil? }
    else
      total_copies - borrowings.active.count
    end
  end
end
