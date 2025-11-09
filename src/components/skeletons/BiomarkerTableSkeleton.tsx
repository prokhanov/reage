import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BiomarkerTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((categoryIndex) => (
        <Card key={categoryIndex} className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((rowIndex) => (
                <div key={rowIndex} className="flex gap-4 py-2 border-b border-border/30">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-5 w-1/6" />
                  <Skeleton className="h-5 w-1/6" />
                  <Skeleton className="h-5 w-1/6" />
                  <Skeleton className="h-5 w-1/4" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
