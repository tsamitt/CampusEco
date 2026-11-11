import { useEffect, useState } from "react";

// Shared pieces for the three End-User (tracking) pages.
// Data comes from the global CampusEco object that public/Models.js defines.

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

// Footer note and the demo reset button that the old pages kept in their own footer.
export function DemoNote() {
  function resetDemo() {
    if (window.confirm("Reset all demo data in this browser?")) {
      window.CampusEco.resetDemo();
      window.location.href = "tracking.html";
    }
  }
  return (
    <p className="demo-note">
      Data is stored in this browser only.{" "}
      <button type="button" className="btn-link" onClick={resetDemo}>
        Reset demo data
      </button>
    </p>
  );
}
