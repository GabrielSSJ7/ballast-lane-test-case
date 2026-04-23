import { useState } from "react";
import { mutate } from "swr";
import { borrowingApi } from "../../../entities/borrowing/api/borrowingApi";
import { Button } from "../../../shared/ui/Button";
import { ApiError } from "../../../shared/api/client";

interface ReturnButtonProps {
  borrowingId: number;
  onReturned?: () => void;
}

export function ReturnButton({ borrowingId, onReturned }: ReturnButtonProps) {
  const [isReturning, setIsReturning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReturn = async () => {
    setIsReturning(true);
    setError(null);
    try {
      await borrowingApi.returnBook(borrowingId);
      await mutate("/api/v1/borrowings");
      await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/books"));
      await mutate("/api/v1/dashboard/librarian");
      onReturned?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string>;
        setError(data?.error ?? "Failed to return book.");
      } else {
        setError("Failed to return book.");
      }
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        isLoading={isReturning}
        onClick={handleReturn}
      >
        Return
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
