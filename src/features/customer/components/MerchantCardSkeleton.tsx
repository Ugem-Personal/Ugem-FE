export function MerchantCardSkeleton({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xs ${
            compact ? "rounded-2xl p-3 flex gap-3.5" : "rounded-3xl"
          }`}
        >
          {compact ? (
            <>
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800" />
                <div className="h-3 w-1/2 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/60" />
                <div className="mt-2 flex gap-2">
                  <div className="h-6 w-14 animate-pulse rounded-lg bg-amber-100/70 dark:bg-amber-950/50" />
                  <div className="h-6 w-16 animate-pulse rounded-lg bg-cyan-100/70 dark:bg-cyan-950/50" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-52 w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-2/3 animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800" />
                  <div className="h-5 w-5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-4 w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/60" />
                <div className="h-4 w-4/5 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/60" />
                <div className="pt-2 flex items-center gap-2">
                  <div className="h-7 w-16 animate-pulse rounded-xl bg-amber-100/70 dark:bg-amber-950/50" />
                  <div className="h-7 w-20 animate-pulse rounded-xl bg-cyan-100/70 dark:bg-cyan-950/50" />
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
