import { useEffect, useRef, useState } from "react";
import "../css/tracking.css";
import { useTrackingBody } from "./trackingShared";

// End-User delivery preferences (formerly trackingpreferences.html + Trackingpreferences.js).
export default function TrackingPreferences() {
  useTrackingBody();
  const C = window.CampusEco;
  const [form, setForm] = useState(() => C.PrefsStore.load());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const buildingRef = useRef(null);

  const buildingCode = (form.building || "").trim().toUpperCase();
  const buildingName = C.BUILDINGS[buildingCode];
  const unknownBuilding = buildingCode.length === 2 && !buildingName;

  // Mark an unknown building code as invalid so the browser blocks the save.
  useEffect(() => {
    buildingRef.current?.setCustomValidity(unknownBuilding ? "That building code is not on the campus map." : "");
  }, [unknownBuilding]);

  // Hide the "saved" message after a few seconds.
  useEffect(() => {
    if (!saved) return undefined;
    const id = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(id);
  }, [saved]);

  function set(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault(); // stay on the page; the browser already checked pattern and required
    setError("");
    if (!form.notifyEmail && !form.notifyText) {
      setError("Choose at least one way to be notified.");
      return;
    }
    C.PrefsStore.save(
      new C.Preferences({
        notifyEmail: form.notifyEmail,
        notifyText: form.notifyText,
        phone: (form.phone || "").trim(),
        window: form.window,
        building: buildingCode,
        fallback: form.fallback,
        signatureOnFile: form.signatureOnFile,
      }),
    );
    setSaved(true);
  }

  function handleReset() {
    C.PrefsStore.reset();
    setForm(C.PrefsStore.load());
    setError("");
    setSaved(false);
  }

  return (
    <div className="tracking-portal">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <main id="main">
        <h2>Delivery Preferences</h2>
        <p>
          <a href="tracking.html">Back to Your Packages</a>
        </p>

        <section className="card narrow" aria-labelledby="prefs-h">
          <h3 id="prefs-h">Update Your Preferences</h3>

          <form id="prefs-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>Notify Me By</legend>
              <label className="check">
                <input
                  type="checkbox"
                  id="notify-email"
                  name="notify"
                  value="email"
                  checked={form.notifyEmail}
                  onChange={(e) => set("notifyEmail", e.target.checked)}
                />
                Email
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  id="notify-text"
                  name="notify"
                  value="text"
                  checked={form.notifyText}
                  onChange={(e) => set("notifyText", e.target.checked)}
                />
                Text Message
              </label>

              {form.notifyText && (
                <div id="phone-field" className="field">
                  <label htmlFor="phone">Mobile Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="507-555-0123"
                    pattern="^\(?\d{3}\)?[\-.\s]?\d{3}[\-.\s]?\d{4}$"
                    title="Enter a 10 digit U.S. phone number, for example 507-555-0123"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    required
                  />
                </div>
              )}
            </fieldset>

            <div className="field">
              <label htmlFor="delivery-window">Preferred Delivery Window</label>
              <select
                id="delivery-window"
                name="delivery-window"
                value={form.window}
                onChange={(e) => set("window", e.target.value)}
              >
                <option value="">No preference</option>
                <option value="morning">Morning (8 AM &ndash; 11 AM)</option>
                <option value="midday">Midday (11 AM &ndash; 2 PM)</option>
                <option value="afternoon">Afternoon (2 PM &ndash; 5 PM)</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="pref-building">Preferred Pickup Building</label>
              <input
                type="text"
                id="pref-building"
                name="pref-building"
                ref={buildingRef}
                pattern="^[A-Za-z]{2}$"
                title="Please enter a two character building code."
                placeholder="e.g. ML"
                maxLength="2"
                autoComplete="off"
                list="building-list"
                value={form.building}
                onChange={(e) => set("building", e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())}
              />
              <datalist id="building-list">
                {Object.keys(C.BUILDINGS)
                  .sort()
                  .map((code) => (
                    <option key={code} value={code}>
                      {C.BUILDINGS[code]}
                    </option>
                  ))}
              </datalist>
              <p className="hint" role="status" aria-live="polite">
                {buildingCode.length === 2 && (buildingName ? buildingCode + " is " + buildingName + "." : "Unknown building code.")}
              </p>
            </div>

            <fieldset>
              <legend>If Locker Array Is Full</legend>
              <label className="check">
                <input
                  type="radio"
                  name="fallback"
                  value="hold"
                  checked={form.fallback === "hold"}
                  onChange={() => set("fallback", "hold")}
                />
                Hold at central hub
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="fallback"
                  value="nearest"
                  checked={form.fallback === "nearest"}
                  onChange={() => set("fallback", "nearest")}
                />
                Deliver to nearest available locker
              </label>
            </fieldset>

            <label className="check">
              <input
                type="checkbox"
                id="signature-on-file"
                name="signature-on-file"
                checked={form.signatureOnFile}
                onChange={(e) => set("signatureOnFile", e.target.checked)}
              />
              Keep my signature on file to skip manual confirmation for low-priority packages
            </label>
            <p className="hint">Saved in this browser for now. Account storage comes later.</p>

            <p className={"feedback" + (error ? " error" : "")} role="alert">
              {error}
            </p>

            <div className="btn-row">
              <button type="submit" className="btn">
                Save Preferences
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Reset to defaults
              </button>
            </div>
            {saved && (
              <p className="toast" role="status">
                Preferences saved.
              </p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
