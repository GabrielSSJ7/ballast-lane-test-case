class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  enum :role, { member: 0, librarian: 1 }, default: :member

  has_many :borrowings, dependent: :destroy

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :password, length: { minimum: 8 }, allow_nil: true

  def librarian? = role == "librarian"
  def member? = role == "member"
end
