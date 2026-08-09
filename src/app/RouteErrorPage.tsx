import { useEffect } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function RouteErrorPage() {
  const error = useRouteError();

  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    message = error.message;
  }

  const isChunkError =
    error instanceof Error &&
    (error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed"));

  useEffect(() => {
    if (isChunkError) {
      const storageKey = "ugem_chunk_reload_attempted";
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, "true");
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        textAlign: "center",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 24,
          padding: 32,
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{ margin: 0, fontSize: 14, color: "#2563eb", fontWeight: 700 }}
        >
          {isChunkError ? "Cập nhật ứng dụng" : "Something went wrong"}
        </p>
        <h1 style={{ margin: "16px 0 8px", fontSize: 32, lineHeight: 1.1, fontWeight: 900 }}>
          {isChunkError ? "Đã có bản cập nhật mới!" : "Oops."}
        </h1>
        <p style={{ margin: 0, color: "#334155", fontSize: 15, fontWeight: 500 }}>
          {isChunkError
            ? "Hệ thống vừa được nâng cấp phiên bản mới. Vui lòng ấn Tải lại trang để tiếp tục."
            : "We weren’t able to load this page. Please try again or return to a safe page."}
        </p>
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            background: "#f8fafc",
            color: "#64748b",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            textAlign: "left",
          }}
        >
          {message}
        </pre>
        <div
          style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}
        >
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("ugem_chunk_reload_attempted");
              window.location.reload();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 24px",
              borderRadius: 999,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Tải lại trang
          </button>
          <Link
            to="/customer/orders"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              borderRadius: 999,
              background: "#f1f5f9",
              color: "#334155",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Đơn hàng của tôi
          </Link>
        </div>
      </div>
    </main>
  );
}
