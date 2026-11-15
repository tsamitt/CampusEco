import { useCallback, useEffect, useRef, useState } from "react";
import { courierApi } from "../Api/courierApi.js";

// Shared pieces for the three Courier pages (courier, register, update).
// Courier, package and cart data come from the C# API (see src/Api/courierApi.js).
// Map and date helpers still come from the global CampusEco object in public/Models.js.

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
    cart.name +
    " (" +
    cart.batteryPercentage +
    "%" +
    (cart.needsCharge ? ", needs charge" : "") +
    ")"
  );
}

// Loads data from the API when the page opens. Returns { loading, error, data, reload }.
// Call reload() after saving something to fetch fresh data.
// `load` should be a function defined outside the component (so it never changes).
export function useApiData(load) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  const reload = useCallback(async () => {
    try {
      const data = await load();
      setState({ loading: false, error: "", data });
      return data;
    } catch (err) {
      setState((s) => ({ loading: false, error: err.message, data: s.data }));
      return null;
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

// Looks a barcode up in the API while the courier types it.
// Returns null while the barcode is incomplete, { loading: true } while waiting,
// then { pkg } (the package, or null if no package has that barcode).
export function usePackageLookup(barcode) {
  const valid = isValidBarcode(barcode);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!valid) return undefined;
    let cancelled = false;
    courierApi
      .getPackage(barcode)
      .then((pkg) => !cancelled && setResult({ barcode, pkg }))
      .catch((err) => !cancelled && setResult({ barcode, pkg: null, error: err.status === 404 ? "" : err.message }));
    return () => {
      cancelled = true;
    };
  }, [barcode, valid]);

  if (!valid) return null;
  // Still waiting for the answer for this barcode (an older answer is ignored).
  if (!result || result.barcode !== barcode) return { loading: true };
  return result;
}

// Same rule as the HTML pattern attribute: 1234-5678-9012
export function isValidBarcode(barcode) {
  return /^[0-9]{4}-[0-9]{4}-[0-9]{4}$/.test(String(barcode));
}

// Red message with a Try again button, shown when the API can't be reached.
export function ApiError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="form-message is-error" role="alert">
      {message}{" "}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
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