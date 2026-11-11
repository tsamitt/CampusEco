import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import "../css/courier.css";
const { CourierStore, Dispatch, resetCourierDemo } = window.CampusEcoCourier;
import {
  BatteryBar,
  FormMessage,
  PriorityBadge,
  StatusBadge,
  cartLabel,
  useFlashMessage,
  useStoreRefresh,
} from "./CourierShared.jsx";

const SEGMENT_MS = 350; // time for the cart to drive between two waypoints

// Converts a map.png pixel position into a CSS percentage.
function percent(value, total) {
  return (value / total) * 100 + "%";
}

// Groups the active deliveries by building, so two packages for the same
// building become one stop. activeStops() is already sorted most urgent
// first, so each stop keeps the position of its most urgent package.
function groupStopsByBuilding() {
  const stops = [];
  Dispatch.activeStops().forEach((pkg) => {
    let stop = stops.find((s) => s.building === pkg.building);
    if (!stop) {
      stop = { building: pkg.building, name: pkg.buildingName, packages: [] };
      stops.push(stop);
    }
    stop.packages.push(pkg);
  });
  return stops;
}

function barcodeList(stop) {
  return stop.packages.map((pkg) => pkg.barcode).join(", ");
}

// Eco-Transit Crew dashboard (formerly courier.html + courier.js).
export default function CourierMain() {
  const C = window.CampusEco;
  const [, refresh] = useStoreRefresh();
  const [message, showMessage] = useFlashMessage(3500);

  // Data for this render (read fresh from the stores every time)
  const courier = CourierStore.loadCourier();
  const carts = CourierStore.carts();
  const queue = Dispatch.queue();
  const mine = Dispatch.myDeliveries();
  const stops = groupStopsByBuilding();

  // Toolbar
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [chosenCart, setChosenCart] = useState("");
  const searchRef = useRef(null);

  // Keep the courier's choice if it is still usable, otherwise pick the first charged cart.
  const usableCarts = carts.filter((cart) => !cart.needsCharge);
  const quickCart = usableCarts.some((cart) => cart.id === chosenCart)
    ? chosenCart
    : usableCarts.length
      ? usableCarts[0].id
      : "";

  const term = search.trim().toLowerCase();
  const visibleQueue = queue.filter(
    (pkg) =>
      (pkg.barcode.indexOf(term) !== -1 || pkg.building.toLowerCase().indexOf(term) !== -1) &&
      (priority === "all" || pkg.priority === priority),
  );

  // My Deliveries
  const [hideDelivered, setHideDelivered] = useState(false);
  const [expanded, setExpanded] = useState([]); // barcodes with the details row open
  const [flash, setFlash] = useState({ barcode: null, n: 0 });
  const [fading, setFading] = useState(null); // queue row fading out after a claim

  const visibleMine = mine.filter((pkg) => !(hideDelivered && pkg.group === "delivered"));

  function flashRow(barcode) {
    setFlash((f) => ({ barcode, n: f.n + 1 }));
  }

  // Claim button in the route queue
  function claim(barcode) {
    let pkg;
    try {
      pkg = Dispatch.claim(barcode, quickCart);
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

    // Fade the row out of the queue, then rebuild and flash the new row.
    setFading(barcode);
    window.setTimeout(() => {
      setFading(null);
      refresh();
      flashRow(barcode);
      showMessage("Claimed " + barcode + " for " + pkg.building + " on " + quickCart + ".");
    }, C.animationMs(300));
  }

  function toggleDetails(barcode) {
    setExpanded((list) =>
      list.indexOf(barcode) !== -1 ? list.filter((b) => b !== barcode) : list.concat(barcode),
    );
  }

  // Slide-out status panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPkg, setPanelPkg] = useState(null);
  const [panelStatus, setPanelStatus] = useState("");
  const [panelNotes, setPanelNotes] = useState("");
  const firstOptionRef = useRef(null);

  function openPanel(pkg) {
    setPanelPkg(pkg);
    setPanelStatus(Dispatch.nextStatuses(pkg)[0] || "");
    setPanelNotes("");
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  useEffect(() => {
    if (panelOpen && firstOptionRef.current) firstOptionRef.current.focus();
  }, [panelOpen, panelPkg]);

  function submitPanel(event) {
    event.preventDefault(); // stay on the page
    const barcode = panelPkg.barcode;
    let pkg;

    try {
      pkg = Dispatch.updateStatus(barcode, panelStatus, panelNotes.trim());
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

    closePanel();
    refresh();
    flashRow(barcode);
    showMessage(barcode + ' is now "' + pkg.status + '".');

    if (pkg.status === "En Route") driveTo(pkg.building);
  }

  // Cart route map: uses the shared routeTo() waypoints from Models.js,
  // so the cart follows the same roads as the End-User tracking map.
  const hub = C.routeTo("AH")[0]; // every route starts at the Central Hub
  const cartRef = useRef(null);
  const cartPos = useRef(hub);
  const runId = useRef(0); // bumped to cancel a drive that is in progress
  const [routeStatus, setRouteStatus] = useState("");
  const [routing, setRouting] = useState(false);
  const [visited, setVisited] = useState([]);

  function setCartPos(point) {
    cartPos.current = point;
    if (cartRef.current) {
      cartRef.current.style.left = percent(point.x, C.MAP.width);
      cartRef.current.style.top = percent(point.y, C.MAP.height);
    }
  }

  function placeCartAtHub() {
    runId.current += 1;
    setCartPos(hub);
  }

  // Glides the cart to one point. Resolves false if the drive was cancelled.
  function animateTo(point, run) {
    const ms = C.animationMs(SEGMENT_MS);
    return new Promise((resolve) => {
      if (run !== runId.current) return resolve(false);
      if (ms === 0) {
        setCartPos(point);
        return resolve(true);
      }
      const from = cartPos.current;
      const start = performance.now();
      function frame(now) {
        if (run !== runId.current) return resolve(false);
        const t = Math.min(1, (now - start) / ms);
        setCartPos({ x: from.x + (point.x - from.x) * t, y: from.y + (point.y - from.y) * t });
        if (t < 1) requestAnimationFrame(frame);
        else resolve(true);
      }
      requestAnimationFrame(frame);
    });
  }

  function wait(ms, run) {
    return new Promise((resolve) =>
      window.setTimeout(() => resolve(run === runId.current), C.animationMs(ms)),
    );
  }

  // Drives through each waypoint in order, so the cart follows the road.
  async function followRoute(points, run) {
    for (const point of points) {
      if (!(await animateTo(point, run))) return false;
      if (point.where) setRouteStatus(point.where);
    }
    return true;
  }

  function driveTo(building) {
    placeCartAtHub();
    followRoute(C.routeTo(building).slice(1), runId.current);
  }

  async function startRoute() {
    const routeStops = groupStopsByBuilding();
    if (routeStops.length === 0) {
      setRouteStatus("No active deliveries to drive to.");
      return;
    }

    placeCartAtHub();
    const run = runId.current;
    setRouting(true);
    setVisited([]);

    // Out to each building once and back to the hub, most urgent first.
    for (let i = 0; i < routeStops.length; i++) {
      const stop = routeStops[i];
      const route = C.routeTo(stop.building);
      const count = stop.packages.length;

      if (!(await followRoute(route.slice(1), run))) return;
      setRouteStatus(
        "Stop " + (i + 1) + ": " + stop.name + " - " + count +
          (count === 1 ? " package (" : " packages (") + barcodeList(stop) + ")",
      );
      setVisited((list) => list.concat(stop.building));

      if (!(await wait(600, run))) return;
      if (!(await followRoute(route.slice(0, -1).reverse(), run))) return;
    }

    setRouteStatus("Route complete - back at the Central Hub.");
    setRouting(false);
  }

  function resetRoute() {
    placeCartAtHub();
    setVisited([]);
    setRouteStatus("");
    setRouting(false);
  }

  // Put the cart on the hub when the page loads; stop any drive when it unloads.
  useLayoutEffect(() => {
    setCartPos(hub);
    return () => {
      runId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: "/" jumps to the queue search, Escape closes the status panel.
  useEffect(() => {
    function onKeyDown(event) {
      const tag = (event.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";

      if (event.key === "Escape") {
        setPanelOpen(false);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset demo data (packages and courier data)
  function resetDemo() {
    if (window.confirm("Reset all demo data in this browser?")) {
      resetCourierDemo();
      resetRoute();
      setExpanded([]);
      refresh();
      showMessage("Demo data reset.");
    }
  }

  const panelOptions = panelPkg ? Dispatch.nextStatuses(panelPkg) : [];

  return (
    <>
      <main>
        <section>
          <h2>Couriers</h2>

          <p id="courier-greeting" className="courier-greeting">
            {courier ? (
              "Signed in as " + courier.name + " (" + courier.roleLabel + ", " + courier.shift + " shift)"
            ) : (
              <>
                You are using a guest account. <a href="courierRegister.html">Register as a courier</a>
              </>
            )}
          </p>

          <FormMessage id="courier-message" message={message} />

          <section>
            <h3>Delivery Activity</h3>

            <div>
              <a href="courierUpdate.html">Claim or Update Delivery</a>
            </div>

            <div>
              <a href="courierRegister.html">Courier Registration</a>
            </div>

            {/* Toolbar: search, priority filter, and the cart used for dashboard claims */}
            <div className="courier-toolbar">
              <label htmlFor="queue-search">Search queue</label>
              <input
                type="search"
                id="queue-search"
                ref={searchRef}
                placeholder="Barcode or building (press / to focus)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <label htmlFor="queue-priority">Priority</label>
              <select id="queue-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="all">All</option>
                <option value="Urgent">Urgent</option>
                <option value="Standard">Standard</option>
                <option value="Low">Low</option>
              </select>

              <label htmlFor="claim-cart-quick">Claim using</label>
              <select id="claim-cart-quick" value={quickCart} onChange={(e) => setChosenCart(e.target.value)}>
                {carts.map((cart) => (
                  <option key={cart.id} value={cart.id} disabled={cart.needsCharge}>
                    {cartLabel(cart)}
                  </option>
                ))}
              </select>
            </div>

            <table id="queue-table">
              <caption>
                Route queue: deliveries waiting to be claimed (<span id="queue-count">{queue.length}</span>)
              </caption>

              <thead>
                <tr>
                  <th scope="col">Stop</th>
                  <th scope="col">Tracking Barcode</th>
                  <th scope="col">Building</th>
                  <th scope="col">Locker Array</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody id="queue-body">
                {queue.map((pkg, i) =>
                  visibleQueue.indexOf(pkg) === -1 ? null : (
                    <tr
                      key={pkg.barcode}
                      data-barcode={pkg.barcode}
                      className={fading === pkg.barcode ? "fade-out" : undefined}
                    >
                      <td>{i + 1}</td>
                      <td>{pkg.barcode}</td>
                      <td title={pkg.buildingName}>{pkg.building}</td>
                      <td>{pkg.locker}</td>
                      <td>{Number(pkg.weightLb).toFixed(1) + " lb"}</td>
                      <td>
                        <PriorityBadge priority={pkg.priority} />
                      </td>
                      <td>
                        <StatusBadge status={pkg.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="claim-btn"
                          disabled={fading !== null}
                          onClick={() => claim(pkg.barcode)}
                        >
                          Claim
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                {queue.length === 0 && (
                  <tr>
                    <td colSpan={8}>No deliveries waiting. Nice work!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section>
            <h3>My Deliveries</h3>

            <label className="courier-inline">
              <input
                type="checkbox"
                id="hide-delivered"
                checked={hideDelivered}
                onChange={(e) => setHideDelivered(e.target.checked)}
              />{" "}
              Hide delivered packages
            </label>

            <table id="my-table">
              <caption>
                Deliveries you have claimed (<span id="my-count">{Dispatch.activeStops().length + " active"}</span>)
              </caption>

              <thead>
                <tr>
                  <th scope="col">Tracking Barcode</th>
                  <th scope="col">Building</th>
                  <th scope="col">Locker Array</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody id="my-body">
                {visibleMine.map((pkg) => {
                  const isFlashing = flash.barcode === pkg.barcode;
                  return (
                    <Fragment key={pkg.barcode}>
                      <tr
                        // A new key replays the flash animation each time the row is updated.
                        key={isFlashing ? "flash-" + flash.n : "row"}
                        data-barcode={pkg.barcode}
                        data-group={pkg.group}
                        className={isFlashing ? "flash" : undefined}
                      >
                        <td>{pkg.barcode}</td>
                        <td title={pkg.buildingName}>{pkg.building}</td>
                        <td>{pkg.locker}</td>
                        <td>
                          <PriorityBadge priority={pkg.priority} />
                        </td>
                        <td>
                          <StatusBadge status={Dispatch.displayStatus(pkg)} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="view-btn"
                            aria-expanded={expanded.indexOf(pkg.barcode) !== -1}
                            onClick={() => toggleDetails(pkg.barcode)}
                          >
                            View
                          </button>
                          {Dispatch.nextStatuses(pkg).length > 0 && (
                            <>
                              {" "}
                              <button type="button" className="update-btn" onClick={() => openPanel(pkg)}>
                                Update Status
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {expanded.indexOf(pkg.barcode) !== -1 && <DetailsRow pkg={pkg} />}
                    </Fragment>
                  );
                })}
                {mine.length === 0 && (
                  <tr>
                    <td colSpan={6}>You haven&apos;t claimed any deliveries yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section>
            <h3>Cart Route Map</h3>
            <p>
              Pins show your active deliveries. Press <strong>Start Route</strong> to drive the cart from the
              Central Hub to each stop and back.
            </p>

            <div className="courier-map-controls">
              <button type="button" id="start-route" disabled={routing} onClick={startRoute}>
                Start Route
              </button>
              <button type="button" id="reset-route" onClick={resetRoute}>
                Return to Hub
              </button>
              <span id="route-status" aria-live="polite">
                {routeStatus}
              </span>
            </div>

            <div id="courier-map" className="courier-map">
              <div
                id="map-hub"
                className="map-hub"
                title="Central Hub"
                style={{ left: percent(hub.x, C.MAP.width), top: percent(hub.y, C.MAP.height) }}
              >
                HUB
              </div>

              {stops.map((stop, i) => {
                const point = C.BUILDING_POINTS[stop.building];
                if (!point) return null;
                return (
                  <div
                    key={stop.building}
                    className={"map-pin" + (visited.indexOf(stop.building) !== -1 ? " visited" : "")}
                    title={stop.name + ": " + barcodeList(stop)}
                    data-building={stop.building}
                    style={{ left: percent(point.x, C.MAP.width), top: percent(point.y, C.MAP.height) }}
                  >
                    {i + 1}
                    {/* Package count when a stop has more than one package */}
                    {stop.packages.length > 1 && <span className="pin-count">{stop.packages.length}</span>}
                  </div>
                );
              })}

              <div id="courier-cart" ref={cartRef} className="cart-marker" title="Your cart">
                &#128667;
              </div>
            </div>
          </section>

          <section>
            <h3>Cart Battery Status</h3>
            <div id="battery-list" className="battery-list">
              {carts.map((cart) => (
                <div key={cart.id} className={"battery-card battery-" + cart.batteryState}>
                  <strong>{cart.id}</strong>
                  <BatteryBar level={cart.batteryPct} />
                  <span>{cart.batteryPct + "%" + (cart.needsCharge ? " - needs charge" : "")}</span>
                </div>
              ))}
            </div>
            <a href="courierUpdate.html#battery-form">Report Battery Status</a>
          </section>

          <p>
            <button type="button" id="courier-reset" className="secondary-button" onClick={resetDemo}>
              Reset demo data
            </button>
          </p>
        </section>
      </main>

      {/* Slide-out panel for updating a delivery's status (opened by "Update Status") */}
      <aside
        id="status-panel"
        className={"status-panel" + (panelOpen ? " is-open" : "")}
        aria-hidden={!panelOpen}
        inert={!panelOpen}
      >
        <button type="button" id="close-panel" className="close-panel" aria-label="Close panel" onClick={closePanel}>
          &times;
        </button>
        <h3>Update Status</h3>
        <p>
          Package <strong id="panel-barcode">{panelPkg ? panelPkg.barcode : ""}</strong>
        </p>
        <p>
          Current status:{" "}
          <span id="panel-current">{panelPkg && <StatusBadge status={Dispatch.displayStatus(panelPkg)} />}</span>
        </p>

        <form id="panel-form" onSubmit={submitPanel}>
          <fieldset>
            <legend>New Status *</legend>
            <div id="panel-options">
              {/* Only offer the statuses that come after the current one. */}
              {panelOptions.map((status, i) => (
                <label key={status}>
                  <input
                    type="radio"
                    name="panel-status"
                    value={status}
                    required
                    ref={i === 0 ? firstOptionRef : undefined}
                    checked={panelStatus === status}
                    onChange={() => setPanelStatus(status)}
                  />{" "}
                  {status}
                </label>
              ))}
            </div>
          </fieldset>

          <label htmlFor="panel-notes">Notes?</label>
          <textarea
            id="panel-notes"
            rows="3"
            maxLength={250}
            value={panelNotes}
            onChange={(e) => setPanelNotes(e.target.value)}
          ></textarea>

          <button type="submit">Save Status</button>
        </form>
      </aside>
    </>
  );
}

// "View" opens a details row under the package with its timeline.
function DetailsRow({ pkg }) {
  const C = window.CampusEco;
  return (
    <tr className="details-row">
      <td colSpan={6}>
        <div className="details-box slide-in">
          <p>
            {pkg.building + ", " + pkg.buildingName + " | " + pkg.weightLb + " lb | " + pkg.cart.id +
              " (" + pkg.cart.batteryPct + "% battery)"}
          </p>
          <ol className="timeline">
            {Dispatch.timeline(pkg).map((item, i) => (
              <li key={i}>
                {item.status + " - " + C.formatDateTime(item.at) + (item.notes ? " - " + item.notes : "")}
              </li>
            ))}
          </ol>
        </div>
      </td>
    </tr>
  );
}