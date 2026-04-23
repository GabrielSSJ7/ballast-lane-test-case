import { Link } from "react-router";
import { useAuthStore } from "../../user/model/store";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Card, CardContent } from "../../../shared/ui/Card";
import type { Book } from "../model/types";

interface BookCardProps {
  book: Book;
  onBorrow?: (book: Book) => void;
  onDelete?: (book: Book) => void;
}

export function BookCard({ book, onBorrow, onDelete }: BookCardProps) {
  const user = useAuthStore((s) => s.user);
  const isLibrarian = user?.role === "librarian";
  const isMember = user?.role === "member";
  const available = book.available_copies > 0;

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900">{book.title}</h3>
            <p className="text-sm text-gray-600">{book.author}</p>
          </div>
          <Badge variant={available ? "success" : "danger"}>
            {book.available_copies}/{book.total_copies}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="info">{book.genre}</Badge>
        </div>
        <p className="text-xs text-gray-400">ISBN: {book.isbn}</p>
        <div className="mt-auto flex gap-2 pt-2">
          {isMember && available && onBorrow && (
            <Button size="sm" onClick={() => onBorrow(book)} className="flex-1">
              Borrow
            </Button>
          )}
          {isMember && !available && (
            <Button size="sm" variant="outline" disabled className="flex-1">
              Unavailable
            </Button>
          )}
          {isLibrarian && (
            <>
              <Link to={`/books/${book.id}/edit`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Edit
                </Button>
              </Link>
              {onDelete && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDelete(book)}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
