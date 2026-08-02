import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

const routeLabel = (pathname: string) => {
  if (pathname === "/login") return "Đăng nhập";
  if (pathname === "/register") return "Đăng ký";
  if (pathname.startsWith("/admin")) return "Khu vực quản trị";
  if (pathname.startsWith("/staff")) return "Khu vực nhân viên";
  if (pathname.startsWith("/merchant")) return "Khu vực merchant";
  if (pathname.startsWith("/customer")) return "Khu vực khách hàng";
  if (pathname.startsWith("/notifications")) return "Thông báo";
  if (pathname.startsWith("/reviews")) return "Đánh giá";
  if (pathname.startsWith("/check-in")) return "Check-in";
  return "UGem";
};

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
        <span className="text-sm font-medium">Đang tải UGem...</span>
      </div>
    </main>
  );
}

export default function RouteLoadingBoundary() {
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const currentRouteLabel = routeLabel(pathname);

  useEffect(() => {
    document.title = `${currentRouteLabel} — UGem`;
    contentRef.current?.focus({ preventScroll: true });
  }, [currentRouteLabel, pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Bỏ qua đến nội dung chính
      </a>
      <div
        ref={contentRef}
        id="main-content"
        tabIndex={-1}
        className="outline-none"
      >
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Đã chuyển đến trang {currentRouteLabel}
      </p>
    </>
  );
}
