"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function EngineRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("engine console error:", error.name, error.digest ?? "");
  }, [error]);

  return (
    <main id="main-content" className="page-pad" data-route-error>
      <div className="card" data-tone="peach">
        <h1 className="t-h2">Presentation console hit an unexpected error</h1>
        <p style={{ marginTop: "var(--s2)" }}>
          The example engine view could not finish rendering. No live institution or learner data was affected.
        </p>
        <div className="wrap-2" style={{ marginTop: "var(--s3)" }}>
          <button type="button" className="btn btn-ctl btn-primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn-ctl btn-secondary" href="/">
            Open learner app
          </Link>
        </div>
      </div>
    </main>
  );
}
