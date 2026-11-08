"use client";

/** Last-resort error page when a root layout itself fails. Must render its own html and body. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f5f5f7", color: "#1d1d1f" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, letterSpacing: "-0.02em" }}>We will be right back</h1>
          <p style={{ color: "#6e6e73" }}>The store hit an unexpected problem. Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 16, height: 44, padding: "0 24px", borderRadius: 999, border: 0, background: "#0071e3", color: "#fff", fontSize: 15 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
