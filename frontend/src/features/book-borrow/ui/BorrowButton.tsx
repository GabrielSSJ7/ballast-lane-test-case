import { useState } from "react";
import { mutate } from "swr";
import { apiClient, ApiError } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/Button";
import type { Book } from "../../../entities/book/model/types";

interface BorrowButtonProps {
  book: Book;
  onBorrowed?: () => void;
}

export function BorrowButton({ book, onBorrowed }: BorrowButtonProps) {
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBorrow = async () => {
    setIsBorrowing(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/books/${book.id}/borrowings`);
      await mutate("/api/v1/borrowings");
      await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/books"));
      onBorrowed?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string>;
        setError(data?.error ?? "Failed to borrow book.");
      } else {
        setError("Failed to borrow book.");
      }
    } finally {
      setIsBorrowing(false);
    }
  };

  return (
    <div>
      <Button size="sm" isLoading={isBorrowing} onClick={handleBorrow}>
        Borrow
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
