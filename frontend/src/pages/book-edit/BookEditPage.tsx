import { useParams } from "react-router";
import { BookForm } from "../../features/book-create/ui/BookForm";
import { useBook } from "../../entities/book/api/useBooks";
import { Spinner } from "../../shared/ui/Spinner";

export function BookEditPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: book, isLoading } = useBook(isEditing ? Number(id) : 0);

  if (isEditing && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isEditing ? "Edit Book" : "Add New Book"}
      </h1>
      <BookForm book={isEditing ? book : undefined} />
    </div>
  );
}
