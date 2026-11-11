import { useEffect, useState } from "react";
import "../css/courier.css";
const { CourierStore, Dispatch, EcoCart, isValidBarcode } = window.CampusEcoCourier;
import { BatteryBar, FormMessage, cartLabel, useFlashMessage, useStoreRefresh } from "./CourierShared.jsx";

const STATUS_OPTIONS = ["Loaded", "En Route", "Delivered"];

const REPORT_TYPES = [
  { value: "start", label: "Start of shift" },
  { value: "mid", label: "Mid-shift" },
  { value: "end", label: "End of shift" },
];

const ISSUES = [
  { value: "charge", label: "Needs to be Charged" },
  { value: "slow", label: "Reduced speed" },
  { value: "warning", label: "Warning light on" },
];

// Claim, transit milestone and battery forms (formerly courierUpdate.html + courierUpdate.js).
export default function CourierUpdate() {
  const C = window.CampusEco;
  const [, refresh] = useStoreRefresh();

  // Suggestions and dropdowns built from the current data
  const queue = Dispatch.queue();
  const activeStops = Dispatch.activeStops();
  const carts = CourierStore.carts();

  // The dashboard links to #battery-form; scroll there once the page has rendered.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = hash && document.getElementById(hash);
    if (target) target.scrollIntoView();
  }, []);

  return (
    <main>
      <section>
        <h2>Courier Updates</h2>

        <a href="courier.html">Back to Courier Dashboard</a>

        <ClaimForm C={C} queue={queue} carts={carts} onSaved={refresh} />
        <StatusForm C={C} activeStops={activeStops} onSaved={refresh} />
        <BatteryForm C={C} carts={carts} onSaved={refresh} />
      </section>
    </main>
  );
}

// 1. Claim a Delivery
function ClaimForm({ C, queue, carts, onSaved }) {
  const [barcode, setBarcode] = useState("");
  const [cartId, setCartId] = useState("");
  const [weight, setWeight] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, showMessage] = useFlashMessage(4000);

  // Looks the barcode up as it is typed.
  const trimmed = barcode.trim();
  let info = "";
  if (isValidBarcode(trimmed)) {
    const pkg = C.PackageStore.find(trimmed);
    if (!pkg) {
      info = "No package with that barcode is checked in at the hub.";
    } else if (!Dispatch.isQueued(pkg)) {
      info = "Not in the route queue (" + Dispatch.displayStatus(pkg) + ").";
    } else {
      info = pkg.building + ", " + pkg.locker + " - " + pkg.priority + " - hub weight " + pkg.weightLb + " lb";
    }
  }

  // Keep the barcode in the XXXX-XXXX-XXXX format and pre-fill the hub weight.
  function changeBarcode(event) {
    const formatted = C.formatBarcode(event.target.value);
    setBarcode(formatted);
    if (isValidBarcode(formatted)) {
      const pkg = C.PackageStore.find(formatted);
      if (pkg && Dispatch.isQueued(pkg)) setWeight(String(pkg.weightLb));
    }
  }

  function clear() {
    setBarcode("");
    setCartId("");
    setWeight("");
    setConfirmed(false);
  }

  function handleSubmit(event) {
    event.preventDefault(); // stay on the page. The browser already checked required and pattern.
    let pkg;

    try {
      pkg = Dispatch.claim(trimmed, cartId, parseFloat(weight));
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

    showMessage("Claimed " + trimmed + " for " + pkg.building + " on " + cartId + ".");
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
                {pkg.building + " - " + pkg.priority}
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
              <option key={cart.id} value={cart.id} disabled={cart.needsCharge}>
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
          <button type="submit">Claim Delivery</button> <button type="reset">Clear</button>
        </div>

        <FormMessage id="claim-message" message={message} />
      </form>
    </section>
  );
}

// 2. Update Transit Milestone
function StatusForm({ C, activeStops, onSaved }) {
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [message, showMessage] = useFlashMessage(4000);

  // Only enable the statuses that make sense for the typed barcode.
  const trimmed = barcode.trim();
  const pkg = isValidBarcode(trimmed) ? C.PackageStore.find(trimmed) : null;
  let allowed = STATUS_OPTIONS;
  let info = "";

  if (!pkg) {
    info = isValidBarcode(trimmed) ? "No package with that barcode." : "";
  } else if (!Dispatch.isMine(pkg)) {
    allowed = [];
    info = "Claim this package before updating its status.";
  } else {
    allowed = Dispatch.nextStatuses(pkg);
    info = "Current status: " + Dispatch.displayStatus(pkg) + (allowed.length ? "" : " (complete)");
  }

  // A choice that is no longer allowed for this barcode is cleared.
  const chosen = allowed.indexOf(status) !== -1 ? status : "";

  function handleSubmit(event) {
    event.preventDefault();

    if (!chosen) {
      showMessage("Pick a new status.", "error");
      return;
    }

    try {
      Dispatch.updateStatus(trimmed, chosen, notes.trim());
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

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
        {/* Barcodes you have claimed */}
        <datalist id="my-barcodes">
          {activeStops.map((p) => (
            <option key={p.barcode} value={p.barcode}>
              {p.building + " - " + Dispatch.displayStatus(p)}
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

        <button type="submit">Update Status</button>

        <FormMessage id="status-message" message={message} />
      </form>
    </section>
  );
}

// 3. Report Battery Status
function BatteryForm({ C, carts, onSaved }) {
  const [cartId, setCartId] = useState("");
  const [level, setLevel] = useState("");
  const [touched, setTouched] = useState(false);
  const [previewState, setPreviewState] = useState("good");
  const [reportType, setReportType] = useState("");
  const [issues, setIssues] = useState([]);
  const [message, showMessage] = useFlashMessage(4000);

  // Shows the cart's last report when one is picked.
  const selectedCart = carts.find((cart) => cart.id === cartId) || null;
  const lastReport = selectedCart
    ? "Last report: " + selectedCart.batteryPct + "% (" + C.formatDateTime(selectedCart.lastReportAt) + ")"
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

    // Re-use the EcoCart model to decide the colour.
    setPreviewState(new EcoCart({ id: "preview", batteryPct: value }).batteryState);

    // Below 20% the cart needs charging, so tick that box for the courier.
    if (value < 20) setIssues((list) => (list.indexOf("charge") === -1 ? list.concat("charge") : list));
  }

  function toggleIssue(value, checked) {
    setIssues((list) => (checked ? list.concat(value) : list.filter((v) => v !== value)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    let cart;

    try {
      // Keep the issues in the same order as the checkboxes.
      const ordered = ISSUES.map((i) => i.value).filter((v) => issues.indexOf(v) !== -1);
      cart = Dispatch.reportBattery(cartId, level, reportType, ordered);
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

    const warning = cart.needsCharge ? " This cart is now marked as needing a charge." : "";
    showMessage(
      cart.id + " battery saved at " + cart.batteryPct + "%." + warning,
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
            <option key={cart.id} value={cart.id}>
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

        <button type="submit">Submit Report</button>

        <FormMessage id="battery-message" message={message} />
      </form>
    </section>
  );
}