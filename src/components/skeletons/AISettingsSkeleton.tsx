import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AISettingsSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <Skeleton className="h-9 w-80 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-32 mb-2" />
              </div>
              <Skeleton className="h-6 w-full mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
