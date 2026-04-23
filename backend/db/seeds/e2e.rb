# E2E seed file — deterministic fixtures for E2E test suite
# Run via: rails runner "load 'db/seeds/e2e.rb'" RAILS_ENV=test
# Safe to run multiple times (truncates first)

puts "=== Loading E2E seeds ==="

# Wipe tables in FK-safe order
JwtDenylist.delete_all
Borrowing.delete_all
Book.delete_all
User.delete_all

puts "  Tables cleared."

# ── Users ──────────────────────────────────────────────────────────────────────

librarian = User.create!(
  email: "e2e_librarian@library.com",
  name: "E2E Librarian",
  password: "password123",
  role: :librarian
)
puts "  Created librarian: #{librarian.email}"

member1 = User.create!(
  email: "e2e_member1@library.com",
  name: "E2E Member One",
  password: "password123",
  role: :member
)
puts "  Created member1: #{member1.email}"

member2 = User.create!(
  email: "e2e_member2@library.com",
  name: "E2E Member Two",
  password: "password123",
  role: :member
)
puts "  Created member2: #{member2.email}"

# ── Books ──────────────────────────────────────────────────────────────────────

# E2E-001..E2E-007: fully available, various genres
book_001 = Book.create!(
  isbn: "E2E-001",
  title: "E2E Book One",
  author: "Author One",
  genre: "Fiction",
  total_copies: 3
)

book_002 = Book.create!(
  isbn: "E2E-002",
  title: "E2E Book Two",
  author: "Author Two",
  genre: "Science",
  total_copies: 3
)

book_003 = Book.create!(
  isbn: "E2E-003",
  title: "E2E Book Three",
  author: "Author Three",
  genre: "Technology",
  total_copies: 3
)

book_004 = Book.create!(
  isbn: "E2E-004",
  title: "E2E Book Four",
  author: "Author Four",
  genre: "Science",
  total_copies: 3
)

book_005 = Book.create!(
  isbn: "E2E-005",
  title: "E2E Book Five",
  author: "Author Five",
  genre: "Fiction",
  total_copies: 3
)

book_006 = Book.create!(
  isbn: "E2E-006",
  title: "E2E Book Six",
  author: "Author Six",
  genre: "History",
  total_copies: 3
)

book_007 = Book.create!(
  isbn: "E2E-007",
  title: "E2E Book Seven",
  author: "Author Seven",
  genre: "Philosophy",
  total_copies: 3
)

# E2E-008: total_copies=3, will have 1 active borrowing → available=2
book_008 = Book.create!(
  isbn: "E2E-008",
  title: "E2E Borrowed Book",
  author: "Author Eight",
  genre: "Mystery",
  total_copies: 3
)

# E2E-009: total_copies=1, will have 1 active borrowing → available=0
book_009 = Book.create!(
  isbn: "E2E-009",
  title: "E2E Unavailable Book",
  author: "Author Nine",
  genre: "Horror",
  total_copies: 1
)

# E2E-010: total_copies=2, will have 1 overdue borrowing → available=1
book_010 = Book.create!(
  isbn: "E2E-010",
  title: "E2E Overdue Book",
  author: "Author Ten",
  genre: "Thriller",
  total_copies: 2
)

# E2E-011..E2E-025: filler books for pagination (25 total seeded)
(11..25).each do |n|
  Book.create!(
    isbn: "E2E-#{n.to_s.rjust(3, '0')}",
    title: "E2E Filler Book #{n}",
    author: "Filler Author",
    genre: "Filler",
    total_copies: 2
  )
end

puts "  Created 25 books."

# ── Borrowings ─────────────────────────────────────────────────────────────────

# member1 borrows E2E-008 (active, due 11 days from now, borrowed 3 days ago)
Borrowing.create!(
  user: member1,
  book: book_008,
  borrowed_at: 3.days.ago,
  due_at: 11.days.from_now
)
puts "  member1 borrowed E2E-008 (active, due in 11 days)"

# member2 borrows E2E-009 (active, due 9 days from now, borrowed 5 days ago)
Borrowing.create!(
  user: member2,
  book: book_009,
  borrowed_at: 5.days.ago,
  due_at: 9.days.from_now
)
puts "  member2 borrowed E2E-009 (active, due in 9 days)"

# member1 borrows E2E-010 (overdue: due_at 7 days ago, borrowed 21 days ago)
Borrowing.create!(
  user: member1,
  book: book_010,
  borrowed_at: 21.days.ago,
  due_at: 7.days.ago
)
puts "  member1 borrowed E2E-010 (overdue)"

puts "=== E2E seeds loaded successfully ==="
