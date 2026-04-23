import { Badge } from "../../../shared/ui/Badge";
import type { Borrowing } from "../model/types";

interface BorrowingRowProps {
  borrowing: Borrowing;
  actions?: React.ReactNode;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BorrowingRow({ borrowing, actions }: BorrowingRowProps) {
  const isActive = !borrowing.returned_at;
  const isOverdue = borrowing.overdue;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{borrowing.book.title}</p>
          <p className="text-sm text-gray-500">{borrowing.book.author}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(borrowing.borrowed_at)}</td>
      <td className="px-4 py-3 text-sm">
        <span className={isOverdue ? "font-medium text-red-600" : "text-gray-600"}>
          {formatDate(borrowing.due_at)}
        </span>
      </td>
      <td className="px-4 py-3">
        {borrowing.returned_at ? (
          <Badge variant="success">Returned</Badge>
        ) : isOverdue ? (
          <Badge variant="danger">Overdue</Badge>
        ) : (
          <Badge variant="info">Active</Badge>
        )}
      </td>
      {actions && <td className="px-4 py-3">{actions}</td>}
    </tr>
  );
}
