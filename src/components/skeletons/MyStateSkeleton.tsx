import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MyStateSkeleton() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <Skeleton className="h-2 w-full mb-4" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Category card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-10 w-20" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
