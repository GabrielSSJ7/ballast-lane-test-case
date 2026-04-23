import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { mutate } from "swr";
import { bookSchema, type BookFormData } from "../../book-create/model/schema";
import { bookApi } from "../../../entities/book/api/bookApi";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import type { Book } from "../../../entities/book/model/types";

interface BookFormProps {
  book?: Book;
}

export function BookForm({ book }: BookFormProps) {
  const navigate = useNavigate();
  const isEditing = !!book;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: book
      ? {
          title: book.title,
          author: book.author,
          genre: book.genre,
          isbn: book.isbn,
          total_copies: book.total_copies,
        }
      : undefined,
  });

  const onSubmit = async (data: BookFormData) => {
    try {
      if (isEditing && book) {
        await bookApi.update(book.id, data);
      } else {
        await bookApi.create(data);
      }
      await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/books"));
      navigate("/books");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError("root", { message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <Input
        label="Title"
        error={errors.title?.message}
        {...register("title")}
      />
      <Input
        label="Author"
        error={errors.author?.message}
        {...register("author")}
      />
      <Input
        label="Genre"
        error={errors.genre?.message}
        {...register("genre")}
      />
      <Input
        label="ISBN"
        error={errors.isbn?.message}
        {...register("isbn")}
      />
      <Input
        label="Total Copies"
        type="number"
        min="0"
        error={errors.total_copies?.message}
        {...register("total_copies")}
      />
      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {isEditing ? "Update Book" : "Create Book"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/books")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
