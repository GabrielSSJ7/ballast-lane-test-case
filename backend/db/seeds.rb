# Idempotent seed file — safe to run multiple times

puts "Seeding database..."

# Librarian
librarian = User.find_or_create_by!(email: "librarian@library.com") do |u|
  u.name = "Head Librarian"
  u.password = "password123"
  u.role = :librarian
end
puts "  Librarian: #{librarian.email}"

# Members
3.times do |i|
  member = User.find_or_create_by!(email: "member#{i + 1}@library.com") do |u|
    u.name = "Member #{i + 1}"
    u.password = "password123"
    u.role = :member
  end
  puts "  Member: #{member.email}"
end

# Books data
books_data = [
  { title: "The Pragmatic Programmer", author: "David Thomas", genre: "Technology", isbn: "978-0135957059", total_copies: 3 },
  { title: "Clean Code", author: "Robert C. Martin", genre: "Technology", isbn: "978-0132350884", total_copies: 2 },
  { title: "Design Patterns", author: "Gang of Four", genre: "Technology", isbn: "978-0201633610", total_copies: 4 },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Fiction", isbn: "978-0743273565", total_copies: 5 },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Fiction", isbn: "978-0061935466", total_copies: 3 },
  { title: "1984", author: "George Orwell", genre: "Fiction", isbn: "978-0451524935", total_copies: 4 },
  { title: "Dune", author: "Frank Herbert", genre: "Science Fiction", isbn: "978-0441013593", total_copies: 2 },
  { title: "Foundation", author: "Isaac Asimov", genre: "Science Fiction", isbn: "978-0553293357", total_copies: 3 },
  { title: "Neuromancer", author: "William Gibson", genre: "Science Fiction", isbn: "978-0441569595", total_copies: 2 },
  { title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", isbn: "978-0547928227", total_copies: 4 },
  { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", genre: "Fantasy", isbn: "978-0439708180", total_copies: 5 },
  { title: "A Brief History of Time", author: "Stephen Hawking", genre: "Science", isbn: "978-0553380163", total_copies: 2 },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "History", isbn: "978-0062316110", total_copies: 3 },
  { title: "The Art of War", author: "Sun Tzu", genre: "Philosophy", isbn: "978-1590302255", total_copies: 6 },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "Psychology", isbn: "978-0374533557", total_copies: 2 }
]

books = books_data.map do |data|
  book = Book.find_or_create_by!(isbn: data[:isbn]) do |b|
    b.title = data[:title]
    b.author = data[:author]
    b.genre = data[:genre]
    b.total_copies = data[:total_copies]
  end
  puts "  Book: #{book.title}"
  book
end

# Borrowings — idempotent: only create if none exist
if Borrowing.none?
  members = User.where(role: :member).order(:id)

  # Active borrowing (due in 1 week)
  Borrowing.create!(
    user: members.first,
    book: books[0],
    borrowed_at: 1.week.ago,
    due_at: 1.week.from_now
  )
  puts "  Active borrowing: #{members.first.email} => #{books[0].title}"

  # Overdue borrowing
  Borrowing.create!(
    user: members.second,
    book: books[1],
    borrowed_at: 3.weeks.ago,
    due_at: 1.week.ago
  )
  puts "  Overdue borrowing: #{members.second.email} => #{books[1].title}"

  # Due today
  Borrowing.create!(
    user: members.last,
    book: books[2],
    borrowed_at: 2.weeks.ago,
    due_at: Date.current.end_of_day
  )
  puts "  Due today borrowing: #{members.last.email} => #{books[2].title}"

  # Returned borrowing (for history)
  Borrowing.create!(
    user: members.first,
    book: books[3],
    borrowed_at: 4.weeks.ago,
    due_at: 2.weeks.ago,
    returned_at: 3.weeks.ago
  )
  puts "  Returned borrowing created"
end

puts "Seeding complete!"
