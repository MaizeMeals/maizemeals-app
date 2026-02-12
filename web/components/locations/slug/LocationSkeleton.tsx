import { Skeleton } from "@/components/ui/skeleton"

export function LocationSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
      {/* Hero Skeleton */}
      <div className="relative h-[40vh] min-h-[300px] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <Skeleton className="h-full w-full" />
        <div className="absolute bottom-0 left-0 p-6 w-full space-y-2">
          <Skeleton className="h-8 w-2/3 bg-slate-300 dark:bg-slate-700" />
          <Skeleton className="h-4 w-1/3 bg-slate-300 dark:bg-slate-700" />
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Skeleton className="h-10 w-24 rounded-full" />
          <div className="flex gap-2">
             <Skeleton className="h-10 w-10 rounded-full" />
             <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Menu Tabs Skeleton */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 py-4 min-w-max">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 opacity-70">
                 <Skeleton className="h-4 w-16" />
                 {i === 1 && <Skeleton className="h-0.5 w-full bg-maize" />}
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
              <Skeleton className="h-6 w-48" />
            </div>

            {/* Food Items */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-start justify-between p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-4 w-12 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-4 w-8 rounded" />
                    <Skeleton className="h-6 w-6 rounded-full" />
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
