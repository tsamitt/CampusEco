import { useEffect, useState } from "react";
import "../css/courier.css";
import { courierApi, loadSignedInCourier } from "../Api/courierApi";
import {
  ApiError,
  BatteryBar,
  FormMessage,
  cartLabel,
  isValidBarcode,
  useApiData,
  useFlashMessage,
  usePackageLookup,
} from "./CourierShared.jsx";

const STATUS_OPTIONS = ["Loaded", "En Route", "Delivered"];

const REPORT_TYPES = [
  { value: "Start", label: "Start of shift" },
  { value: "Mid", label: "Mid-shift" },
  { value: "End", label: "End of shift" },
];

const ISSUES = [
  { value: "charge", label: "Needs to be Charged" },
  { value: "slow", label: "Reduced speed" },
  { value: "warning", label: "Warning light on" },
];

// Same colour rule the API uses for a cart's battery.
function batteryState(level) {
  if (level < 20) return "critical";
  if (level < 50) return "low";
  return "good";
}

// Loads what the three forms need from the API.
async function loadUpdatePage() {
  const [courier, queue, carts] = await Promise.all([
    loadSignedInCourier(),
    courierApi.queue(),
    courierApi.carts(),
  ]);
  const mine = courier ? await courierApi.deliveries(courier.id) : [];
  return { courier, queue, carts, mine };
}

// Claim, transit milestone and battery forms (formerly courierUpdate.html + courierUpdate.js).
export default function CourierUpdate() {
  const C = window.CampusEco;
  const { loading, error, data, reload } = useApiData(loadUpdatePage);

  const courier = data ? data.courier : null;
  const queue = data ? data.queue : [];
  const carts = data ? data.carts : [];
  const mine = data ? data.mine : [];

  // The dashboard links to #battery-form; scroll there once the page has loaded.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    const target = hash && document.getElementById(hash);
    if (target) target.scrollIntoView();
  }, [loading]);

  return (
    <main>
      <section>
        <h2>Courier Updates</h2>

        <a href="courier.html">Back to Courier Dashboard</a>

        <p className="courier-greeting">
          {loading ? (
            "Loading..."
          ) : courier ? (
            "Signed in as " + courier.name + " (" + courier.roleLabel + ")"
          ) : (
            <>
              You are not signed in. <a href="courierRegister.html">Register or sign in</a> to claim and update
              deliveries.
            </>
          )}
        </p>

        <ApiError message={error} onRetry={reload} />

        <ClaimForm C={C} courier={courier} queue={queue} carts={carts} onSaved={reload} />
        <StatusForm courier={courier} mine={mine} onSaved={reload} />
        <BatteryForm C={C} courier={courier} carts={carts} onSaved={reload} />
      </section>
    </main>
  );
}

// 1. Claim a Delivery
function ClaimForm({ C, courier, queue, carts, onSaved }) {
  const [barcode, setBarcode] = useState("");
  const [cartId, setCartId] = useState("");
  const [weight, setWeight] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, showMessage] = useFlashMessage(4000);

  // Looks the barcode up as it is typed: first in the route queue, then in the API.
  const trimmed = barcode.trim();
  const queued = queue.find((p) => p.barcode === trimmed) || null;
  const lookup = usePackageLookup(queued ? "" : trimmed);

  let info = "";
  if (queued) {
    info = queued.buildingCode + ", " + queued.lockerId + " - " + queued.priority + " - hub weight " + queued.weightLb + " lb";
  } else if (lookup && lookup.loading) {
    info = "Looking up " + trimmed + "...";
  } else if (lookup && lookup.error) {
    info = lookup.error;
  } else if (lookup && !lookup.pkg) {
    info = "No package with that barcode is checked in at the hub.";
  } else if (lookup && lookup.pkg) {
    const atHub = lookup.pkg.status === "Checked In" || lookup.pkg.status === "Awaiting Pickup";
    info = "Not in the route queue (" + (atHub ? "already claimed" : lookup.pkg.status) + ").";
  }

  // Keep the barcode in the XXXX-XXXX-XXXX format and pre-fill the hub weight.
  function changeBarcode(event) {
    const formatted = C.formatBarcode(event.target.value);
    setBarcode(formatted);
    if (isValidBarcode(formatted)) {
      const pkg = queue.find((p) => p.barcode === formatted);
      if (pkg) setWeight(String(pkg.weightLb));
    }
  }

  function clear() {
    setBarcode("");
    setCartId("");
    setWeight("");
    setConfirmed(false);
  }

  async function handleSubmit(event) {
    event.preventDefault(); // stay on the page. The browser already checked required and pattern.
    if (!courier) {
      showMessage("Register or sign in as a courier before claiming a delivery.", "error");
      return;
    }

    setSaving(true);
    let pkg;
    try {
      pkg = await courierApi.claim(courier.id, trimmed, Number(cartId), parseFloat(weight));
    } catch (err) {
      setSaving(false);
      showMessage(err.message, "error");
      return;
    }

    setSaving(false);
    showMessage("Claimed " + trimmed + " for " + pkg.buildingCode + " on " + pkg.cartName + ".");
    clear();
    onSaved();
  }

  return (
    <section>
      <h3>Claim a Delivery</h3>
      <form id="claim-form" onSubmit={handleSubmit} onReset={clear}>
        <p>* Required field</p>

        <div>
          <label htmlFor="claim-barcode">Tracking Barcode *</label>
          <input
            type="text"
            id="claim-barcode"
            name="claim-barcode"
            placeholder="1234-5678-9012"
            pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
            title="Format: 4 digits, dash, 4 digits, dash, 4 digits"
            list="queue-barcodes"
            autoComplete="off"
            required
            value={barcode}
            onChange={changeBarcode}
          />
          {/* Barcodes still in the route queue */}
          <datalist id="queue-barcodes">
            {queue.map((pkg) => (
              <option key={pkg.barcode} value={pkg.barcode}>
                {pkg.buildingCode + " - " + pkg.priority}
              </option>
            ))}
          </datalist>
          <span id="claim-info" className="field-hint">
            {info}
          </span>
        </div>

        <div>
          <label htmlFor="claim-cart">Cart *</label>
          <select id="claim-cart" name="claim-cart" required value={cartId} onChange={(e) => setCartId(e.target.value)}>
            <option value="">Select a cart</option>
            {/* A cart that needs charging can't be claimed with. */}
            {carts.map((cart) => (
              <option key={cart.id} value={String(cart.id)} disabled={cart.needsCharge}>
                {cartLabel(cart)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="claim-weight">Verified Weight (lb, max 150) *</label>
          <input
            type="number"
            id="claim-weight"
            name="claim-weight"
            min="0.1"
            max="150"
            step="0.1"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              id="claim-confirm"
              name="claim-confirm"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I confirm I can carry this delivery in my load *
          </label>
        </div>

        <div>
          <button type="submit" disabled={saving}>
            Claim Delivery
          </button>{" "}
          <button type="reset">Clear</button>
        </div>

        <FormMessage id="claim-message" message={message} />
      </form>
    </section>
  );
}

// 2. Update Transit Milestone
function StatusForm({ courier, mine, onSaved }) {
  const C = window.CampusEco;
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, showMessage] = useFlashMessage(4000);

  // Only enable the statuses that make sense for the typed barcode.
  const trimmed = barcode.trim();
  const delivery = mine.find((p) => p.barcode === trimmed) || null;
  // Not one of this courier's deliveries: ask the API whether the package exists at all.
  const lookup = usePackageLookup(delivery || !courier ? "" : trimmed);

  let allowed = STATUS_OPTIONS;
  let info = "";
  if (delivery) {
    allowed = delivery.nextStatuses;
    info = "Current status: " + delivery.displayStatus + (allowed.length ? "" : " (complete)");
  } else if (isValidBarcode(trimmed)) {
    allowed = [];
    if (!courier) info = "Sign in as a courier to update your deliveries.";
    else if (!lookup || lookup.loading) info = "Looking up " + trimmed + "...";
    else if (lookup.error) info = lookup.error;
    else if (!lookup.pkg) info = "No package with that barcode.";
    else info = "Claim this package before updating its status.";
  }

  // A choice that is no longer allowed for this barcode is cleared.
  const chosen = allowed.indexOf(status) !== -1 ? status : "";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!courier) {
      showMessage("Register or sign in as a courier first.", "error");
      return;
    }
    if (!chosen) {
      showMessage("Pick a new status.", "error");
      return;
    }

    setSaving(true);
    try {
      await courierApi.updateStatus(courier.id, trimmed, chosen, notes.trim());
    } catch (err) {
      setSaving(false);
      showMessage(err.message, "error");
      return;
    }

    setSaving(false);
    showMessage(trimmed + ' updated to "' + chosen + '".');
    setBarcode("");
    setStatus("");
    setNotes("");
    onSaved();
  }

  return (
    <section>
      <h3>Update Transit Milestone</h3>

      <form id="status-form" onSubmit={handleSubmit}>
        <p>* Required field</p>

        <label htmlFor="status-barcode">Tracking Barcode *</label>
        <input
          type="text"
          id="status-barcode"
          name="status-barcode"
          placeholder="1234-5678-9012"
          pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
          title="Format: 4 digits, dash, 4 digits, dash, 4 digits"
          list="my-barcodes"
          autoComplete="off"
          required
          value={barcode}
          onChange={(e) => setBarcode(C.formatBarcode(e.target.value))}
        />
        {/* Your deliveries that can still move forward */}
        <datalist id="my-barcodes">
          {mine
            .filter((p) => p.nextStatuses.length > 0)
            .map((p) => (
              <option key={p.barcode} value={p.barcode}>
                {p.buildingCode + " - " + p.displayStatus}
              </option>
            ))}
        </datalist>
        <span id="status-info" className="field-hint">
          {info}
        </span>

        <fieldset>
          <legend>New Status *</legend>
          {STATUS_OPTIONS.map((option, i) => (
            <label key={option}>
              <input
                type="radio"
                name="status"
                value={option}
                required={i === 0}
                disabled={allowed.indexOf(option) === -1}
                checked={chosen === option}
                onChange={() => setStatus(option)}
              />{" "}
              {option}
            </label>
          ))}
        </fieldset>

        <label htmlFor="status-notes">Notes?</label>
        <textarea
          id="status-notes"
          name="status-notes"
          rows="3"
          maxLength={250}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        ></textarea>
        <span id="notes-count" className={"field-hint" + (notes.length > 230 ? " is-near-limit" : "")}>
          {notes.length} / 250
        </span>

        <button type="submit" disabled={saving}>
          Update Status
        </button>

        <FormMessage id="status-message" message={message} />
      </form>
    </section>
  );
}

// 3. Report Battery Status
function BatteryForm({ C, courier, carts, onSaved }) {
  const [cartId, setCartId] = useState("");
  const [level, setLevel] = useState("");
  const [touched, setTouched] = useState(false);
  const [previewState, setPreviewState] = useState("good");
  const [reportType, setReportType] = useState("");
  const [issues, setIssues] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, showMessage] = useFlashMessage(4000);

  // Shows the cart's last report when one is picked.
  const selectedCart = carts.find((cart) => String(cart.id) === cartId) || null;
  const lastReport = selectedCart
    ? "Last report: " + selectedCart.batteryPercentage + "% (" + C.formatDateTime(selectedCart.lastReportAt) + ")"
    : "";

  // Live preview of the battery bar while typing.
  const levelNumber = Number(level);
  const levelValid = level !== "" && levelNumber >= 0 && levelNumber <= 100;
  let previewText = "Enter a level to preview";
  if (levelValid) previewText = levelNumber + "% - " + previewState;
  else if (touched) previewText = "Enter a level between 0 and 100";

  function changeLevel(event) {
    const raw = event.target.value;
    const value = Number(raw);
    setLevel(raw);
    setTouched(true);

    if (raw === "" || value < 0 || value > 100) return;
    setPreviewState(batteryState(value));

    // Below 20% the cart needs charging, so tick that box for the courier.
    if (value < 20) setIssues((list) => (list.indexOf("charge") === -1 ? list.concat("charge") : list));
  }

  function toggleIssue(value, checked) {
    setIssues((list) => (checked ? list.concat(value) : list.filter((v) => v !== value)));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    let cart;
    try {
      cart = await courierApi.reportBattery(Number(cartId), {
        batteryPercentage: levelNumber,
        reportType,
        issues,
        courierId: courier ? courier.id : null,
      });
    } catch (err) {
      setSaving(false);
      showMessage(err.message, "error");
      return;
    }

    setSaving(false);
    const warning = cart.needsCharge ? " This cart is now marked as needing a charge." : "";
    showMessage(
      cart.name + " battery saved at " + cart.batteryPercentage + "%." + warning,
      cart.needsCharge ? "error" : "success",
    );

    setCartId("");
    setLevel("");
    setTouched(false);
    setPreviewState("good");
    setReportType("");
    setIssues([]);
    onSaved();
  }

  return (
    <section>
      <h3>Report Battery Status</h3>

      <form id="battery-form" onSubmit={handleSubmit}>
        <p>* Required field</p>

        <label htmlFor="battery-cart">Cart *</label>
        {/* Any cart can be reported on, even one that needs charging */}
        <select id="battery-cart" name="battery-cart" required value={cartId} onChange={(e) => setCartId(e.target.value)}>
          <option value="">Select a cart</option>
          {carts.map((cart) => (
            <option key={cart.id} value={String(cart.id)}>
              {cartLabel(cart)}
            </option>
          ))}
        </select>
        <span id="battery-last" className="field-hint">
          {lastReport}
        </span>

        <label htmlFor="battery-level">Battery Level (%) *</label>
        <input
          type="number"
          id="battery-level"
          name="battery-level"
          min="0"
          max="100"
          required
          value={level}
          onChange={changeLevel}
        />

        {/* Live preview bar, updated as you type */}
        <div className={"battery-card battery-" + previewState} id="battery-preview">
          <BatteryBar level={levelValid ? levelNumber : 0} ms={250} />
          <span id="battery-preview-text">{previewText}</span>
        </div>

        <fieldset>
          <legend>Report Type *</legend>
          {REPORT_TYPES.map((type, i) => (
            <label key={type.value}>
              <input
                type="radio"
                name="report-type"
                value={type.value}
                required={i === 0}
                checked={reportType === type.value}
                onChange={() => setReportType(type.value)}
              />{" "}
              {type.label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Issues</legend>
          {ISSUES.map((issue) => (
            <label key={issue.value}>
              <input
                type="checkbox"
                name="issue"
                value={issue.value}
                checked={issues.indexOf(issue.value) !== -1}
                onChange={(e) => toggleIssue(issue.value, e.target.checked)}
              />{" "}
              {issue.label}
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={saving}>
          Submit Report
        </button>

        <FormMessage id="battery-message" message={message} />
      </form>
    </section>
  );
}