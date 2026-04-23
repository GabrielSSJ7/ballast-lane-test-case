import { useState } from "react";
import { mutate } from "swr";
import { bookApi } from "../../../entities/book/api/bookApi";
import { Button } from "../../../shared/ui/Button";
import { ApiError } from "../../../shared/api/client";
import type { Book } from "../../../entities/book/model/types";

interface DeleteBookButtonProps {
  book: Book;
  onDeleted?: () => void;
}

export function DeleteBookButton({ book, onDeleted }: DeleteBookButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await bookApi.delete(book.id);
      await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/books"));
      onDeleted?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Cannot delete — book has active borrowings.");
      } else {
        setError("Failed to delete book.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <Button
        variant="danger"
        size="sm"
        isLoading={isDeleting}
        onClick={handleDelete}
      >
        Delete
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
