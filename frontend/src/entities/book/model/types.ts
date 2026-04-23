export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  total_copies: number;
  available_copies: number;
}

export interface BooksResponse {
  books: Book[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface BookFormData {
  title: string;
  author: string;
  genre: string;
  isbn: string;
  total_copies: number;
}
