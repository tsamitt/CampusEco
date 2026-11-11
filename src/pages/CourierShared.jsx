import { useCallback, useEffect, useReducer, useRef, useState } from "react";

// Shared pieces for the three Courier pages (courier, register, update).
// Package data comes from the global CampusEco object that public/Models.js defines;
// courier data comes from ./courierModels.js.

// Colored priority label (Urgent, Standard, Low).
export function PriorityBadge({ priority }) {
  return (
    <span className={"badge priority-" + String(priority).toLowerCase()}>
      {priority}
    </span>
  );
}

// Colored status label (Checked In, Claimed, Loaded, En Route, Delivered, ...).
export function StatusBadge({ status }) {
  const C = window.CampusEco;
  return <span className={"badge badge-" + C.statusSlug(status)}>{status}</span>;
}

// "Cart 2 (64%, needs charge)" style label used in the cart dropdowns.
export function cartLabel(cart) {
  return (
    cart.id +
    " (" +
    cart.batteryPct +
    "%" +
    (cart.needsCharge ? ", needs charge" : "") +
    ")"
  );
}

// Re-renders the page after the stores change. Also refreshes when another
// tab (operator or tracking pages) changes the shared localStorage data.
export function useStoreRefresh() {
  const [version, refresh] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    function onStorage(event) {
      if (!event.key || event.key.indexOf("campuseco.") === 0) refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [version, refresh];
}

// Feedback message that hides itself after a few seconds.
// Returns [message, show] where message is { text, type, id } or null.
export function useFlashMessage(ms) {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const show = useCallback(
    (text, type) => {
      window.clearTimeout(timer.current);
      setMessage({ text, type: type === "error" ? "error" : "success", id: Date.now() });
      timer.current = window.setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [message, show];
}

// Message box used under the forms and above the dashboard tables.
export function FormMessage({ message, id }) {
  return (
    <div
      id={id}
      key={message ? message.id : "empty"}
      className={
        "form-message" +
        (message ? " slide-in " + (message.type === "error" ? "is-error" : "is-success") : "")
      }
      role="status"
      aria-live="polite"
      hidden={!message}
    >
      {message ? message.text : ""}
    </div>
  );
}

// Battery bar that grows from 0 to its level after it appears.
export function BatteryBar({ level, ms }) {
  const C = window.CampusEco;
  const [width, setWidth] = useState(0);
  const duration = C.animationMs(ms === undefined ? 800 : ms);

  useEffect(() => {
    // Wait one frame so the browser paints the empty bar before it animates.
    const frame = requestAnimationFrame(() => setWidth(level));
    return () => cancelAnimationFrame(frame);
  }, [level]);

  return (
    <div className="battery-bar">
      <div
        className="battery-fill"
        style={{ width: width + "%", transition: "width " + duration + "ms ease" }}
      ></div>
    </div>
  );
}