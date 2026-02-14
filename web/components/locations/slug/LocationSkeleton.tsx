import { Skeleton } from "@/components/ui/skeleton"

export function LocationSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Skeleton */}
      <div className="relative h-[40vh] min-h-[300px] w-full bg-muted overflow-hidden">
        <Skeleton className="h-full w-full" />
        <div className="absolute bottom-0 left-0 p-6 w-full space-y-2">
          <Skeleton className="h-8 w-2/3 bg-muted-foreground/20" />
          <Skeleton className="h-4 w-1/3 bg-muted-foreground/20" />
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <Skeleton className="h-10 w-full rounded-full bg-muted" />
          <div className="flex gap-2">
             <Skeleton className="h-10 w-20 rounded-full bg-muted" />
          </div>
        </div>
      </div>

      {/* Menu Tabs Skeleton */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 py-4 min-w-max">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 opacity-70">
                 <Skeleton className="h-4 w-16 bg-muted" />
                 {i === 1 && <Skeleton className="h-0.5 w-full bg-primary" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Content Skeleton */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {[1, 2, 3].map((group) => (
          <div key={group} className="space-y-4">
            {/* Station Header */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded bg-maize/20" />
              <Skeleton className="h-6 w-48 bg-muted" />
            </div>

            {/* Food Items */}
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-start justify-between p-4 border-b border-border last:border-0">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4 bg-muted" />
                    <Skeleton className="h-3 w-1/4 bg-muted" />
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-4 w-12 rounded bg-muted" />
                      <Skeleton className="h-4 w-12 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
