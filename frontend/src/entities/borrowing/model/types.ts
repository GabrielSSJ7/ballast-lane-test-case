import type { Book } from "../../book/model/types";

export interface Borrowing {
  id: number;
  user_id: number;
  book_id: number;
  book: Book;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  overdue: boolean;
}
