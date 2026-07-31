import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function RouteErrorPage() {
  const error = useRouteError();

  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    message = error.message;
  }

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
          Something went wrong
        </p>
        <h1 style={{ margin: "16px 0 8px", fontSize: 38, lineHeight: 1.05 }}>
          Oops.
        </h1>
        <p style={{ margin: 0, color: "#334155", fontSize: 16 }}>
          We weren’t able to load this page. Please try again or return to a
          safe page.
        </p>
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            background: "#f8fafc",
            color: "#0f172a",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message}
        </pre>
        <div
          style={{ marginTop: 24, display: "flex", justifyContent: "center" }}
        >
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              borderRadius: 999,
              background: "#2563eb",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}
