import { useLibrarianDashboard } from "../../entities/dashboard/api/useDashboard";
import { useBorrowings } from "../../entities/borrowing/api/useBorrowings";
import { ReturnButton } from "../../features/book-return/ui/ReturnButton";
import { BorrowingRow } from "../../entities/borrowing/ui/BorrowingRow";
import { BorrowingRowSkeleton } from "../../entities/borrowing/ui/BorrowingRowSkeleton";
import { Card, CardContent, CardHeader } from "../../shared/ui/Card";
import { Skeleton } from "../../shared/ui/Skeleton";

interface StatCardProps {
  label: string;
  value: number | undefined;
  highlight?: boolean;
}

function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>
          {value ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-16" />
      </CardContent>
    </Card>
  );
}

export function DashboardLibrarianPage() {
  const { data: stats, isLoading: statsLoading } = useLibrarianDashboard();
  const { data: borrowings, isLoading: borrowingsLoading } = useBorrowings();

  const activeBorrowings = borrowings?.filter((b) => !b.returned_at) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Librarian Dashboard</h1>
        <p className="text-gray-500">Library overview and borrowings management</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Books" value={stats?.total_books} />
          <StatCard label="Currently Borrowed" value={stats?.total_borrowed} />
          <StatCard label="Due Today" value={stats?.due_today} highlight={(stats?.due_today ?? 0) > 0} />
          <StatCard label="Members with Overdue" value={stats?.members_with_overdue} highlight={(stats?.members_with_overdue ?? 0) > 0} />
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Active Borrowings</h2>
          <p className="text-sm text-gray-500">{activeBorrowings.length} active</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Book</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Borrowed</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Due</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {borrowingsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <BorrowingRowSkeleton key={i} hasActions />)
              ) : activeBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No active borrowings.</td>
                </tr>
              ) : (
                activeBorrowings.map((b) => (
                  <BorrowingRow
                    key={b.id}
                    borrowing={b}
                    actions={<ReturnButton borrowingId={b.id} />}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
