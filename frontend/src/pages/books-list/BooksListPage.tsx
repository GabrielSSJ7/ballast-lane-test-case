import { useState } from "react";
import { Link } from "react-router";
import { useAuthStore } from "../../entities/user/model/store";
import { useBooks } from "../../entities/book/api/useBooks";
import { BookCard } from "../../entities/book/ui/BookCard";
import { BookSearch } from "../../features/book-search/ui/BookSearch";
import { Button } from "../../shared/ui/Button";
import { Spinner } from "../../shared/ui/Spinner";
import { useDebounce } from "../../shared/hooks/useDebounce";
import type { Book } from "../../entities/book/model/types";

export function BooksListPage() {
  const user = useAuthStore((s) => s.user);
  const isLibrarian = user?.role === "librarian";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, error } = useBooks(debouncedSearch, page);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
          {data && (
            <p className="text-sm text-gray-500">{data.meta.total_count} books total</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <BookSearch value={search} onChange={handleSearchChange} />
          {isLibrarian && (
            <Link to="/books/new">
              <Button>Add Book</Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          Failed to load books. Please try again.
        </div>
      )}

      {data && !isLoading && (
        <>
          {data.books.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {debouncedSearch ? `No books found for "${debouncedSearch}"` : "No books available."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.books.map((book: Book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {data.meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {data.meta.current_page} of {data.meta.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
