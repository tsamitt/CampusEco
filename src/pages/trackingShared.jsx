import { useEffect, useState } from "react";
import { trackingApi } from "../Api/trackingApi";

// Shared pieces for the three End-User (tracking) pages.
// Helpers and display rules come from the global CampusEco object that public/Models.js defines;
// package and preference data comes from the API (src/Api/trackingApi.js).

// Marks <body> with the tracking-portal class the shared CSS (tracking.css and theme-responsive.css) looks for.
export function useTrackingBody() {
  useEffect(() => {
    document.body.classList.add("tracking-portal");
    return () => document.body.classList.remove("tracking-portal");
  }, []);
}

export function detailHref(barcode) {
  return "trackingdetail.html?barcode=" + encodeURIComponent(barcode);
}

// Colored status label (Checked In, En Route, Delivered, Cancelled, ...).
export function StatusBadge({ status }) {
  const C = window.CampusEco;
  return <span className={"badge badge-" + C.statusSlug(status)}>{status}</span>;
}

// Counts a number up from zero (skipped when the user prefers reduced motion).
export function useCountUp(target, decimals) {
  const C = window.CampusEco;
  const [value, setValue] = useState(0);
  const reduced = C.animationMs(1) === 0;

  useEffect(() => {
    if (reduced) return undefined;
    const duration = 900;
    const start = performance.now();
    let frame = 0;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  return (reduced ? target : value).toFixed(decimals);
}

// Footer note. Packages and preferences now live in the database; only receipts and "read" marks stay in the browser.
export function DemoNote() {
  function clearBrowserData() {
    if (window.confirm("Clear saved receipts and notification read marks in this browser?")) {
      trackingApi.clearBrowserData();
      window.location.href = "tracking.html";
    }
  }
  return (
    <p className="demo-note">
      Packages and preferences come from the CampusEco database. Receipts are stored in this browser only.{" "}
      <button type="button" className="btn-link" onClick={clearBrowserData}>
        Clear saved receipts
      </button>
    </p>
  );
}

// Shown while a page waits for the API.
export function LoadingNotice({ children }) {
  return (
    <p className="notice" role="status" aria-live="polite">
      {children || "Loading..."}
    </p>
  );
}

// Shown when the API can't be reached or returns an error, with a way to try again.
export function ErrorNotice({ message, onRetry }) {
  return (
    <div className="card" role="alert">
      <h3>We couldn't load this page</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
