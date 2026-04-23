import { Card, CardContent } from "../../../shared/ui/Card";
import { Skeleton } from "../../../shared/ui/Skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-auto h-8 w-full" />
      </CardContent>
    </Card>
  );
}
