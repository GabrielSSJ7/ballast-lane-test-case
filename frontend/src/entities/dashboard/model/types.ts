export interface LibrarianDashboard {
  total_books: number;
  total_borrowed: number;
  due_today: number;
  members_with_overdue: number;
}

export interface MemberDashboard {
  borrowed_books: number;
  overdue_books: number;
}
