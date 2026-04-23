import { Skeleton } from "../../../shared/ui/Skeleton";

interface BorrowingRowSkeletonProps {
  hasActions?: boolean;
}

export function BorrowingRowSkeleton({ hasActions = false }: BorrowingRowSkeletonProps) {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      {hasActions && <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>}
    </tr>
  );
}
