import { Fragment, useEffect, useReducer, useRef, useState } from "react";
import "../css/tracking.css";
import { DemoNote, StatusBadge, detailHref, useCountUp, useTrackingBody } from "./trackingShared";

// End-User dashboard (formerly tracking.html + Tracking.js).
export default function TrackingMain() {
  useTrackingBody();
  const C = window.CampusEco;
  const [, refresh] = useReducer((n) => n + 1, 0);

  const [filter, setFilter] = useState("all");
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState(null); // { found: pkg } or { missing: "code" }
  const [prefsOpen, setPrefsOpen] = useState(false);
  const inputRef = useRef(null);

  // Press "/" anywhere to jump to the search box (unless already typing in a field).
  useEffect(() => {
    function onKey(event) {
      const tag = (event.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Refresh if another tab (for example the courier portal) changes the data.
  useEffect(() => {
    function onStorage(event) {
      if (event.key === "campuseco.packages") refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mine = C.PackageStore.mine();
  const rows = mine.filter((pkg) => filter === "all" || pkg.group === filter);

  const totals = C.CarbonCalculator.totals(C.PackageStore.all(), C.IMPACT_BASELINE);
  const deliveries = useCountUp(totals.deliveries, 0);
  const co2 = useCountUp(totals.co2Kg, 1);
  const trees = useCountUp(totals.trees, 2);

  const lastRead = new Date(C.Notifications.lastRead());
  const notifications = C.Notifications.recent(5);
  const unread = C.Notifications.unreadCount();

  function handleBarcodeChange(event) {
    setBarcode(C.formatBarcode(event.target.value));
    setSearch(null);
  }

  function handleSearch(event) {
    event.preventDefault(); // stay on the page; the browser already checked required and pattern
    const code = barcode.trim();
    const pkg = C.PackageStore.find(code);
    setSearch(pkg ? { found: pkg } : { missing: code });
  }

  const found = search && search.found;

  return (
    <div className="tracking-portal">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <main id="main">
        <h2>Package Tracking</h2>

        <div className="dashboard-grid">
          <section className="card" aria-labelledby="find-h">
            <h3 id="find-h">Find a Package</h3>

            <form id="search-form" className="inline-form" onSubmit={handleSearch}>
              <div className="field">
                <label htmlFor="track-barcode">Tracking Barcode</label>
                <input
                  type="text"
                  id="track-barcode"
                  name="track-barcode"
                  ref={inputRef}
                  value={barcode}
                  onChange={handleBarcodeChange}
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="XXXX-XXXX-XXXX"
                  pattern="^\d{4}(?:-\d{4}){2}$"
                  title="Barcode should be 12 digits with every 4 digits separated by a hyphen: XXXX-XXXX-XXXX"
                />
              </div>
              <button type="submit" className="btn">
                Track Package
              </button>
            </form>
            <p className="hint">
              Tip: press <kbd>/</kbd> to jump to the search box.
            </p>
            <p
              id="search-feedback"
              className={"feedback" + (search ? (found ? " success" : " error") : "")}
              role="status"
              aria-live="polite"
            >
              {found && "Package found."}
              {search && search.missing !== undefined &&
                "No package found for " + search.missing + ". Check the number on your delivery notice and try again."}
            </p>
            {found && (
              <div id="search-result" className="result-card">
                <p className="result-title">
                  <strong>{found.barcode}</strong> <StatusBadge status={found.status} />
                </p>
                <p>
                  Destination: {found.building}, {found.buildingName} ({found.locker})
                </p>
                <p>Last updated: {C.formatDateTime(found.lastUpdated)}</p>
                <a className="btn" href={detailHref(found.barcode)}>
                  View Live Tracking
                </a>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="impact-h">
            <h3 id="impact-h">Your Campus Eco Impact</h3>
            <div className="stat-row">
              <p className="stat">
                <span className="stat-value">{deliveries}</span>
                <span className="stat-label">Deliveries received</span>
              </p>
              <p className="stat">
                <span className="stat-value">{co2}</span>
                <span className="stat-label">kg CO2 saved (estimate)</span>
              </p>
              <p className="stat">
                <span className="stat-value">{trees}</span>
                <span className="stat-label">Tree-years of absorption</span>
              </p>
            </div>
            <p className="hint">
              Estimated from cart miles, doubled for the return trip a car would make, at about 0.404 kg CO2 per
              mile. One tree is assumed to absorb about 21 kg of CO2 per year.
            </p>
          </section>

          <section className="card wide" aria-labelledby="pk-h">
            <div className="card-head">
              <h3 id="pk-h">Your Packages</h3>
              <div className="chip-group" role="group" aria-label="Filter packages">
                {[
                  ["all", "All"],
                  ["active", "In progress"],
                  ["delivered", "Delivered"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="chip"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {rows.length > 0 && (
              <table className="responsive-table" id="packages-table">
                <caption>Packages addressed to you</caption>
                <thead>
                  <tr>
                    <th scope="col">Tracking Barcode</th>
                    <th scope="col">Building</th>
                    <th scope="col">Locker Array</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((pkg) => {
                    const needsSignature = pkg.status === "Delivered" && !pkg.receipt;
                    return (
                      <tr key={pkg.barcode} data-group={pkg.group}>
                        <td data-label="Tracking Barcode">{pkg.barcode}</td>
                        <td data-label="Building">{pkg.building}</td>
                        <td data-label="Locker Array">{pkg.locker}</td>
                        <td data-label="Status">
                          <StatusBadge status={pkg.status} />
                        </td>
                        <td data-label="Last Updated">{C.formatDateTime(pkg.lastUpdated)}</td>
                        <td data-label="Actions">
                          <span className="row-actions">
                            <a className="btn btn-small" href={detailHref(pkg.barcode)}>
                              View Details
                            </a>
                            {needsSignature && (
                              <a className="btn btn-small btn-gold" href={detailHref(pkg.barcode) + "#receipt-h"}>
                                Sign for Package
                              </a>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {rows.length === 0 && <p className="notice">No packages match this filter.</p>}
            <p className="hint" role="status" aria-live="polite">
              Showing {rows.length} of {mine.length} packages
            </p>
          </section>

          <section className="card" aria-labelledby="notif-h">
            <div className="card-head">
              <h3 id="notif-h">
                Notifications
                {unread > 0 && (
                  <span className="count-badge" aria-label={unread + " unread notifications"}>
                    {unread}
                  </span>
                )}
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={unread === 0}
                onClick={() => {
                  C.Notifications.markAllRead();
                  refresh();
                }}
              >
                Mark all read
              </button>
            </div>
            <ul className="notif-list">
              {notifications.map((n, i) => (
                <li key={n.at + i} className={new Date(n.at) > lastRead ? "is-unread" : undefined}>
                  <span className="notif-time">{C.formatDateTime(n.at)}</span>
                  <span className="notif-text">{n.text}</span>
                </li>
              ))}
            </ul>
            {notifications.length === 0 && <p className="notice">No notifications yet.</p>}
          </section>

          <section className="card" aria-labelledby="prefs-h">
            <div className="card-head">
              <h3 id="prefs-h">Delivery Preferences</h3>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                aria-expanded={prefsOpen}
                aria-controls="prefs-panel"
                onClick={() => setPrefsOpen(!prefsOpen)}
              >
                {prefsOpen ? "Hide summary" : "Show summary"}
              </button>
            </div>
            {prefsOpen && (
              <div id="prefs-panel" className="slide-panel">
                <dl className="summary-list">
                  {C.PrefsStore.load()
                    .summary()
                    .map(([label, value]) => (
                      <Fragment key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </Fragment>
                    ))}
                </dl>
              </div>
            )}
            <p>
              <a href="trackingpreferences.html">Manage Delivery Preferences</a>
            </p>
          </section>
        </div>

        <DemoNote />
      </main>
    </div>
  );
}
