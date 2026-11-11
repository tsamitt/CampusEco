import { useEffect, useReducer, useRef, useState } from "react";
import "../css/tracking.css";
import { StatusBadge, useTrackingBody } from "./trackingShared";

const TICK_MS = 4000; // how often the simulated cart moves to its next waypoint

// The cart stops one waypoint short of the building and waits for the courier to mark it Delivered.
function atDestination(pkg) {
  return pkg.routeIndex >= pkg.route.length - 2;
}

function pct(value, total) {
  return ((value / total) * 100).toFixed(3) + "%";
}

// Finds the package from ?barcode= in the URL (falls back to an En Route package of the user's).
function findPackage() {
  const C = window.CampusEco;
  const requested = new URLSearchParams(window.location.search).get("barcode");
  if (requested) return C.PackageStore.find(requested);
  const mine = C.PackageStore.mine();
  return mine.find((p) => p.status === "En Route") || mine[0] || null;
}

// End-User package detail page (formerly trackingdetail.html + Trackingdetail.js).
export default function TrackingDetail() {
  useTrackingBody();
  const [pkg, setPkg] = useState(findPackage);

  if (!pkg) {
    return (
      <div className="tracking-portal">
        <main id="main">
          <h2>Package Details</h2>
          <p>
            <a href="tracking.html">Back to Your Packages</a>
          </p>
          <div className="card">
            <h3>Package not found</h3>
            <p>We could not find that tracking number. Go back and search again.</p>
          </div>
        </main>
      </div>
    );
  }
  return <DetailView key={pkg.barcode} pkg={pkg} setPkg={setPkg} />;
}

function DetailView({ pkg, setPkg }) {
  const C = window.CampusEco;
  const [, bump] = useReducer((n) => n + 1, 0);
  const [paused, setPaused] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [live, setLive] = useState("");
  const animateRef = useRef(false); // true when the next render should glide the cart marker

  // receipt form
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [receiptError, setReceiptError] = useState("");

  const route = pkg.route;
  const arrived = atDestination(pkg);
  const moving = pkg.status === "En Route" && !paused && !arrived;

  function buildingLabel(code) {
    return code + ", " + (C.BUILDINGS[code] || code);
  }

  function update(animate, announcement) {
    C.PackageStore.save(pkg);
    animateRef.current = animate;
    if (announcement) setLive(announcement);
    bump();
  }

  // Cart simulation: one tick every few seconds while the package is En Route.
  useEffect(() => {
    if (!moving) return undefined;
    const id = window.setInterval(() => {
      pkg.advanceOnRoute();
      const text = atDestination(pkg)
        ? pkg.cart.id + " has reached " + buildingLabel(pkg.building) + " and is waiting for the courier to confirm delivery."
        : pkg.cart.id + " is now at " + pkg.currentPoint.where + ".";
      update(true, text);
    }, TICK_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, pkg]);

  // If another tab (for example the courier portal) changes the data, refresh this page.
  useEffect(() => {
    function onStorage(event) {
      if (event.key !== "campuseco.packages") return;
      const fresh = C.PackageStore.find(pkg.barcode);
      if (fresh) {
        animateRef.current = true;
        setPkg(fresh);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pkg.barcode, setPkg, C]);

  // -------- location text --------
  let where;
  let near;
  if (pkg.status === "Cancelled") {
    where = "Cancelled, this package will not be delivered";
    near = "UP";
  } else if (pkg.status === "En Route") {
    where = pkg.cart.id + ": " + pkg.currentPoint.where;
    near = pkg.currentPoint.near;
  } else if (pkg.status === "Delivered") {
    where = "Delivered to " + pkg.locker + " at " + buildingLabel(pkg.building);
    near = pkg.building;
  } else if (pkg.status === "Loaded") {
    where = "Loaded on " + pkg.cart.id + " at the Central Hub";
    near = "UP";
  } else {
    where = "At the Central Hub, waiting to be loaded";
    near = "UP";
  }

  // -------- live pill --------
  let pillClass = "pill-idle";
  let pillText = "Not moving yet";
  if (pkg.status === "Cancelled") {
    pillClass = "pill-cancelled";
    pillText = "Cancelled";
  } else if (pkg.status === "En Route") {
    if (paused) {
      pillText = "Paused";
    } else {
      pillClass = "pill-live";
      pillText = arrived ? "Arriving" : "Live";
    }
  } else if (pkg.status === "Delivered") {
    pillClass = "pill-done";
    pillText = "Delivered";
  }

  const point = route[Math.min(pkg.routeIndex, route.length - 1)];
  const first = route[0];
  const last = route[route.length - 1];
  const glideMs = C.animationMs(TICK_MS - 400);
  const cartStyle = {
    left: pct(point.x, C.MAP.width),
    top: pct(point.y, C.MAP.height),
    display: pkg.status === "Cancelled" ? "none" : undefined,
    transition: animateRef.current && glideMs > 0 ? "left " + glideMs + "ms linear, top " + glideMs + "ms linear" : "none",
  };

  // -------- timeline --------
  const progress = pkg.status === "Cancelled" ? 0 : pkg.progressPct;
  const miles = pkg.milesTravelled;

  // -------- receipt --------
  let receiptNote = "";
  let receiptLocked = true;
  if (!pkg.receipt) {
    if (pkg.status === "Cancelled") {
      receiptNote = "This package was cancelled, so there is nothing to sign for.";
    } else if (!pkg.mine) {
      receiptNote = "Only the person this package is addressed to can sign for it.";
    } else if (pkg.status !== "Delivered") {
      receiptNote = "You can sign for this package once it has been delivered.";
    } else {
      receiptNote = "Your package has arrived. Please confirm that you received it.";
      receiptLocked = false;
    }
  }

  function handleReceipt(event) {
    event.preventDefault(); // no page reload; native required checks have already passed
    const cleanName = name.trim();
    const cleanNotes = notes.trim();
    if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(cleanName)) {
      setReceiptError("Enter your full name using letters only.");
      return;
    }
    if (condition === "damaged" && cleanNotes.length < 5) {
      setReceiptError("Please describe the damage in the notes (at least 5 characters).");
      return;
    }
    setReceiptError("");
    pkg.signFor(cleanName, condition, cleanNotes);
    update(false, "Receipt confirmed for package " + pkg.barcode + ".");
  }

  // -------- demo controls --------
  const advanceLabels = {
    "Checked In": "Load onto cart",
    "Awaiting Pickup": "Load onto cart",
    Loaded: "Start delivery",
    "En Route": "Skip to delivered",
    Delivered: "Delivered",
  };
  const finished = pkg.status === "Delivered" || pkg.status === "Cancelled";

  function advanceStatus() {
    if (pkg.status === "Checked In" || pkg.status === "Awaiting Pickup") pkg.setStatus("Loaded");
    else if (pkg.status === "Loaded") pkg.setStatus("En Route");
    else if (pkg.status === "En Route") pkg.setStatus("Delivered");
    update(true, "Status changed to " + pkg.status + ".");
  }

  function restartPackage() {
    setPaused(false);
    pkg.restart();
    setName("");
    setCondition("");
    setConfirmed(false);
    setNotes("");
    setReceiptError("");
    update(false, "This package was restarted from the beginning.");
  }

  return (
    <div className="tracking-portal">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <main id="main">
        <h2>Package Details</h2>
        <p>
          <a href="tracking.html">Back to Your Packages</a>
        </p>

        <div className="detail-grid">
          <section className="card" aria-labelledby="info-h">
            <h3 id="info-h">Package Information</h3>
            <table className="kv-table">
              <caption>Tracking Barcode {pkg.barcode}</caption>
              <tbody>
                <tr>
                  <th scope="row">Tracking Barcode</th>
                  <td>{pkg.barcode}</td>
                </tr>
                <tr>
                  <th scope="row">Destination Building</th>
                  <td>{buildingLabel(pkg.building)}</td>
                </tr>
                <tr>
                  <th scope="row">Locker Array</th>
                  <td>{pkg.locker}</td>
                </tr>
                <tr>
                  <th scope="row">Weight</th>
                  <td>{pkg.weightLb} lb</td>
                </tr>
                <tr>
                  <th scope="row">Priority</th>
                  <td>{pkg.priority}</td>
                </tr>
                <tr>
                  <th scope="row">Current Status</th>
                  <td>
                    <StatusBadge status={pkg.status} />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="card live" aria-labelledby="live-h">
            <div className="card-head">
              <h3 id="live-h">Real-Time Location Tracking</h3>
              <span className={"pill " + pillClass}>{pillText}</span>
            </div>

            <table className="kv-table">
              <caption>Current tracked location</caption>
              <tbody>
                <tr>
                  <th scope="row">Current Tracked Location</th>
                  <td>{where}</td>
                </tr>
                <tr>
                  <th scope="row">Nearest Building</th>
                  <td>{buildingLabel(near)}</td>
                </tr>
                <tr>
                  <th scope="row">Last Updated</th>
                  <td>{C.formatDateTime(pkg.lastUpdated, true)}</td>
                </tr>
                <tr>
                  <th scope="row">Destination</th>
                  <td>{buildingLabel(pkg.building)}</td>
                </tr>
                <tr>
                  <th scope="row">Cart Battery</th>
                  <td>
                    {pkg.cart.id}, {pkg.cart.batteryPct}% battery
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="map-wrap">
              <img
                src="/map.png"
                alt="Campus map of Minnesota State University, Mankato. The delivery route runs from the Central Hub on the west side of campus to the destination building."
                width="1532"
                height="717"
              />
              <div className="route-layer" aria-hidden="true">
                <svg viewBox={"0 0 " + C.MAP.width + " " + C.MAP.height} preserveAspectRatio="none" focusable="false">
                  <polyline points={route.map((p) => p.x + "," + p.y).join(" ")} />
                </svg>
              </div>
              <span
                className="marker marker-hub"
                aria-hidden="true"
                style={{ left: pct(first.x, C.MAP.width), top: pct(first.y, C.MAP.height) }}
              >
                <span className="marker-label">Hub</span>
              </span>
              <span
                className="marker marker-dest"
                aria-hidden="true"
                style={{ left: pct(last.x, C.MAP.width), top: pct(last.y, C.MAP.height) }}
              >
                <span className="marker-label">{pkg.building}</span>
              </span>
              <span className={"marker marker-cart" + (moving ? " is-moving" : "")} aria-hidden="true" style={cartStyle}>
                <span className="marker-label">{pkg.cart.id}</span>
              </span>
            </div>
            <p className="visually-hidden" role="status" aria-live="polite">
              {live}
            </p>
          </section>

          <section className="card" aria-labelledby="status-h">
            <h3 id="status-h">Delivery Status</h3>
            <div
              className="progress"
              role="progressbar"
              aria-label="Delivery progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div className="progress-fill" style={{ width: progress + "%" }} />
            </div>

            <table className="responsive-table">
              <caption>Delivery milestones for this package</caption>
              <thead>
                <tr>
                  <th scope="col">Milestone</th>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {C.STAGES.map((stage, i) => {
                  const at = pkg.timeOf(stage);
                  let state = "Pending";
                  if (pkg.status === "Cancelled") state = at ? "Complete" : "Cancelled";
                  else if (i < pkg.stage || (i === 3 && pkg.status === "Delivered")) state = "Complete";
                  else if (i === pkg.stage) state = "Current";
                  return (
                    <tr key={stage}>
                      <td data-label="Milestone">{stage}</td>
                      <td data-label="Timestamp">{at ? C.formatDateTime(at) : "Not yet"}</td>
                      <td data-label="Status">
                        <span className={"state state-" + state.toLowerCase()}>{state}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="card" aria-labelledby="carbon-h">
            <h3 id="carbon-h">Carbon Footprint for This Delivery</h3>
            <table className="kv-table">
              <caption>Estimated environmental impact of delivering this package by electric cart</caption>
              <tbody>
                <tr>
                  <th scope="row">Distance Covered by Cart</th>
                  <td>{miles.toFixed(2)} mi</td>
                </tr>
                <tr>
                  <th scope="row">Car Miles Avoided (round trip)</th>
                  <td>{C.CarbonCalculator.carMilesAvoided(miles).toFixed(2)} mi</td>
                </tr>
                <tr>
                  <th scope="row">Estimated CO2 Saved vs. Car Trip</th>
                  <td>{C.CarbonCalculator.co2SavedKg(miles).toFixed(2)} kg</td>
                </tr>
              </tbody>
            </table>
            <p className="hint">Updates as the cart moves. Assumes about 0.404 kg CO2 per car mile.</p>
          </section>

          <section className="card" aria-labelledby="receipt-h">
            <h3 id="receipt-h">Confirm Receipt</h3>

            {receiptNote && (
              <p className="notice" role="status">
                {receiptNote}
              </p>
            )}

            {pkg.receipt ? (
              <div className="confirmation" role="status">
                <p>
                  <strong>Receipt confirmed.</strong>
                </p>
                <p>
                  Signed by {pkg.receipt.name} on {C.formatDateTime(pkg.receipt.signedAt)}.
                </p>
                <p>
                  Condition: {pkg.receipt.condition === "damaged" ? "Damaged" : "Good condition"}
                  {pkg.receipt.notes ? ". Notes: " + pkg.receipt.notes : ""}
                </p>
              </div>
            ) : (
              <>
                <p>* Required field</p>
                <form id="receipt-form" onSubmit={handleReceipt}>
                  <fieldset className="plain" disabled={receiptLocked}>
                    <legend className="visually-hidden">Receipt confirmation</legend>

                    <div className="field">
                      <label htmlFor="recipient-name">Recipient Name *</label>
                      <input
                        type="text"
                        id="recipient-name"
                        name="recipient-name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <fieldset>
                      <legend>Condition on Arrival *</legend>
                      <label className="check">
                        <input
                          type="radio"
                          name="condition"
                          value="good"
                          checked={condition === "good"}
                          onChange={() => setCondition("good")}
                          required
                        />
                        Good condition
                      </label>
                      <label className="check">
                        <input
                          type="radio"
                          name="condition"
                          value="damaged"
                          checked={condition === "damaged"}
                          onChange={() => setCondition("damaged")}
                        />
                        Damaged
                      </label>
                    </fieldset>

                    <label className="check">
                      <input
                        type="checkbox"
                        id="confirm-receipt"
                        name="confirm-receipt"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        required
                      />
                      I confirm I received this package *
                    </label>

                    <div className="field">
                      <label htmlFor="receipt-notes">
                        {condition === "damaged" ? "Notes (required for damaged packages) *" : "Notes (optional)"}
                      </label>
                      <textarea
                        id="receipt-notes"
                        name="receipt-notes"
                        rows="3"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        required={condition === "damaged"}
                      />
                    </div>

                    <p className={"feedback" + (receiptError ? " error" : "")} role="alert">
                      {receiptError}
                    </p>
                    <button type="submit" className="btn">
                      Sign and Confirm Receipt
                    </button>
                  </fieldset>
                </form>
              </>
            )}
          </section>

          <section className="card demo" aria-labelledby="demo-h">
            <div className="card-head">
              <h3 id="demo-h">Demo Controls</h3>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                aria-expanded={demoOpen}
                aria-controls="demo-panel"
                onClick={() => setDemoOpen(!demoOpen)}
              >
                {demoOpen ? "Hide controls" : "Show controls"}
              </button>
            </div>
            {demoOpen && (
              <div id="demo-panel" className="slide-panel">
                <p className="hint">For presenting this build. Later the courier's updates will drive these changes.</p>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn"
                    aria-pressed={paused}
                    disabled={pkg.status !== "En Route" || arrived}
                    onClick={() => {
                      animateRef.current = false;
                      setPaused(!paused);
                    }}
                  >
                    {paused ? "Resume cart" : "Pause cart"}
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={finished} onClick={advanceStatus}>
                    {advanceLabels[pkg.status] || "Advance status"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={restartPackage}>
                    Restart this package
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
