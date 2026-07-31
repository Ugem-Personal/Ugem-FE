import { Suspense } from "react";
import { Outlet } from "react-router-dom";

function RouteLoading() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-background px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-card-foreground shadow-sm">
        <span
          className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="text-sm font-medium">Dang tai UGem...</span>
      </div>
    </main>
  );
}

export default function RouteLoadingBoundary() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Outlet />
    </Suspense>
  );
}
