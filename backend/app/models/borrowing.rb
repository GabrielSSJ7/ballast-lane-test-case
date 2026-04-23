class Borrowing < ApplicationRecord
  belongs_to :user
  belongs_to :book

  validates :borrowed_at, :due_at, presence: true

  scope :active, -> { where(returned_at: nil) }
  scope :overdue, -> { active.where("due_at < ?", Time.current) }
  scope :due_today, -> { active.where(due_at: Date.current.all_day) }

  before_validation :set_dates, on: :create

  private

  def set_dates
    self.borrowed_at ||= Time.current
    self.due_at ||= borrowed_at + 2.weeks
  end
end
