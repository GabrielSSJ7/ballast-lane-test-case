import { useMemberDashboard } from "../../entities/dashboard/api/useDashboard";
import { useBorrowings } from "../../entities/borrowing/api/useBorrowings";
import { BorrowingRow } from "../../entities/borrowing/ui/BorrowingRow";
import { BorrowingRowSkeleton } from "../../entities/borrowing/ui/BorrowingRowSkeleton";
import { Card, CardContent, CardHeader } from "../../shared/ui/Card";
import { Skeleton } from "../../shared/ui/Skeleton";

export function DashboardMemberPage() {
  const { data: stats, isLoading: statsLoading } = useMemberDashboard();
  const { data: borrowings, isLoading: borrowingsLoading } = useBorrowings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500">Your borrowing history and activity</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 pt-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-500">Currently Borrowing</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {stats?.borrowed_books ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-500">Overdue Books</p>
              <p className={`mt-1 text-3xl font-bold ${(stats?.overdue_books ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
                {stats?.overdue_books ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">My Borrowings</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Book</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Borrowed</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Due</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {borrowingsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <BorrowingRowSkeleton key={i} />)
              ) : !borrowings || borrowings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    You have no borrowings yet. Browse the books catalog to borrow!
                  </td>
                </tr>
              ) : (
                borrowings.map((b) => <BorrowingRow key={b.id} borrowing={b} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
