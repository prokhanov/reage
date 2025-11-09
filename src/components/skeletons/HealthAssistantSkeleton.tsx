import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function HealthAssistantSkeleton() {
  return (
    <div className="container max-w-5xl mx-auto px-4 pt-6 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex flex-col flex-1 min-h-0 bg-card/50 backdrop-blur border-border/50">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Assistant message skeleton */}
            <div className="flex gap-3 justify-start">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="max-w-[80%] space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>

            {/* User message skeleton */}
            <div className="flex gap-3 justify-end">
              <div className="max-w-[80%] space-y-2">
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            </div>

            {/* Assistant message skeleton */}
            <div className="flex gap-3 justify-start">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="max-w-[80%] space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border/30">
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-[60px]" />
            <Skeleton className="h-[60px] w-[60px]" />
          </div>
        </div>
      </Card>
    </div>
  );
}
