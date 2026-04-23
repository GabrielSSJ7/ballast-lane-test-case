import { useLibrarianDashboard } from "../../entities/dashboard/api/useDashboard";
import { useBorrowings } from "../../entities/borrowing/api/useBorrowings";
import { ReturnButton } from "../../features/book-return/ui/ReturnButton";
import { BorrowingRow } from "../../entities/borrowing/ui/BorrowingRow";
import { Card, CardContent, CardHeader } from "../../shared/ui/Card";
import { Spinner } from "../../shared/ui/Spinner";

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
        <div className="flex justify-center py-8"><Spinner /></div>
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
        {borrowingsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : activeBorrowings.length === 0 ? (
          <CardContent>
            <p className="text-center text-gray-500">No active borrowings.</p>
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeBorrowings.map((b) => (
                  <BorrowingRow
                    key={b.id}
                    borrowing={b}
                    actions={<ReturnButton borrowingId={b.id} />}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
