import { useMemberDashboard } from "../../entities/dashboard/api/useDashboard";
import { useBorrowings } from "../../entities/borrowing/api/useBorrowings";
import { BorrowingRow } from "../../entities/borrowing/ui/BorrowingRow";
import { Card, CardContent, CardHeader } from "../../shared/ui/Card";
import { Spinner } from "../../shared/ui/Spinner";

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
        <div className="flex justify-center py-8"><Spinner /></div>
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
        {borrowingsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !borrowings || borrowings.length === 0 ? (
          <CardContent>
            <p className="text-center text-gray-500">You have no borrowings yet. Browse the books catalog to borrow!</p>
          </CardContent>
        ) : (
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
                {borrowings.map((b) => (
                  <BorrowingRow key={b.id} borrowing={b} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
