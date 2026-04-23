import { useParams } from "react-router";
import { BookForm } from "../../features/book-create/ui/BookForm";
import { BookFormSkeleton } from "../../features/book-create/ui/BookFormSkeleton";
import { useBook } from "../../entities/book/api/useBooks";
import { Skeleton } from "../../shared/ui/Skeleton";

export function BookEditPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: book, isLoading } = useBook(isEditing ? Number(id) : 0);

  return (
    <div className="space-y-6">
      {isEditing && isLoading ? (
        <Skeleton className="h-8 w-36" />
      ) : (
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "Edit Book" : "Add New Book"}
        </h1>
      )}
      {isEditing && isLoading ? <BookFormSkeleton /> : <BookForm book={isEditing ? book : undefined} />}
    </div>
  );
}
