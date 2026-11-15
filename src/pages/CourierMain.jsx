import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import "../css/courier.css";
import { courierApi, loadSignedInCourier } from "../Api/courierApi";
import {
  ApiError,
  BatteryBar,
  FormMessage,
  PriorityBadge,
  StatusBadge,
  cartLabel,
  useApiData,
  useFlashMessage,
} from "./CourierShared.jsx";

const SEGMENT_MS = 350; // time for the cart to drive between two waypoints

// Converts a map.png pixel position into a CSS percentage.
function percent(value, total) {
  return (value / total) * 100 + "%";
}

// Loads everything the dashboard shows from the API in one go.
async function loadDashboard() {
  const [courier, queue, carts] = await Promise.all([
    loadSignedInCourier(),
    courierApi.queue(),
    courierApi.carts(),
  ]);
  const mine = courier ? await courierApi.deliveries(courier.id) : [];
  return { courier, queue, carts, mine };
}

// Groups the active deliveries by building, so two packages for the same
// building become one stop. The API sends deliveries most urgent first, so
// each stop keeps the position of its most urgent package.
function groupStopsByBuilding(mine) {
  const stops = [];
  mine
    .filter((pkg) => pkg.group === "active")
    .forEach((pkg) => {
      let stop = stops.find((s) => s.building === pkg.buildingCode);
      if (!stop) {
        stop = { building: pkg.buildingCode, name: pkg.buildingName, packages: [] };
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
  const { loading, error, data, reload } = useApiData(loadDashboard);
  const [message, showMessage] = useFlashMessage(3500);

  // Data from the API (empty lists until it arrives)
  const courier = data ? data.courier : null;
  const carts = data ? data.carts : [];
  const queue = data ? data.queue : [];
  const mine = data ? data.mine : [];
  const stops = groupStopsByBuilding(mine);
  const activeCount = mine.filter((pkg) => pkg.group === "active").length;

  // Toolbar
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [chosenCart, setChosenCart] = useState("");
  const searchRef = useRef(null);

  // Keep the courier's choice if it is still usable, otherwise pick the first charged cart.
  const usableCarts = carts.filter((cart) => !cart.needsCharge);
  const quickCart = usableCarts.some((cart) => String(cart.id) === chosenCart)
    ? chosenCart
    : usableCarts.length
      ? String(usableCarts[0].id)
      : "";

  const term = search.trim().toLowerCase();
  const visibleQueue = queue.filter(
    (pkg) =>
      (pkg.barcode.indexOf(term) !== -1 || pkg.buildingCode.toLowerCase().indexOf(term) !== -1) &&
      (priority === "all" || pkg.priority === priority),
  );

  // My Deliveries
  const [hideDelivered, setHideDelivered] = useState(false);
  const [expanded, setExpanded] = useState([]); // barcodes with the details row open
  const [flash, setFlash] = useState({ barcode: null, n: 0 });
  const [fading, setFading] = useState(null); // queue row fading out after a claim
  const [busy, setBusy] = useState(false); // a save is in progress

  const visibleMine = mine.filter((pkg) => !(hideDelivered && pkg.group === "delivered"));

  function flashRow(barcode) {
    setFlash((f) => ({ barcode, n: f.n + 1 }));
  }

  // Claim button in the route queue
  async function claim(barcode) {
    if (!courier) {
      showMessage("Register or sign in as a courier before claiming a delivery.", "error");
      return;
    }
    const cart = carts.find((c) => String(c.id) === quickCart);
    setBusy(true);
    let pkg;
    try {
      pkg = await courierApi.claim(courier.id, barcode, Number(quickCart));
    } catch (err) {
      setBusy(false);
      showMessage(err.message, "error");
      return;
    }

    // Fade the row out of the queue, then reload and flash the new row.
    setFading(barcode);
    window.setTimeout(async () => {
      await reload();
      setFading(null);
      setBusy(false);
      flashRow(barcode);
      showMessage("Claimed " + barcode + " for " + pkg.buildingCode + " on " + (cart ? cart.name : "your cart") + ".");
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
    setPanelStatus(pkg.nextStatuses[0] || "");
    setPanelNotes("");
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  useEffect(() => {
    if (panelOpen && firstOptionRef.current) firstOptionRef.current.focus();
  }, [panelOpen, panelPkg]);

  async function submitPanel(event) {
    event.preventDefault(); // stay on the page
    const barcode = panelPkg.barcode;
    let pkg;

    setBusy(true);
    try {
      pkg = await courierApi.updateStatus(courier.id, barcode, panelStatus, panelNotes.trim());
    } catch (err) {
      setBusy(false);
      showMessage(err.message, "error");
      return;
    }

    closePanel();
    await reload();
    setBusy(false);
    flashRow(barcode);
    showMessage(barcode + ' is now "' + pkg.status + '".');

    if (pkg.status === "En Route") driveTo(pkg.buildingCode);
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
    const routeStops = groupStopsByBuilding(mine);
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

  const panelOptions = panelPkg ? panelPkg.nextStatuses : [];

  return (
    <>
      <main>
        <section>
          <h2>Couriers</h2>

          <p id="courier-greeting" className="courier-greeting">
            {loading ? (
              "Loading..."
            ) : courier ? (
              "Signed in as " + courier.name + " (" + courier.roleLabel + ", " + courier.shift.toLowerCase() + " shift)"
            ) : (
              <>
                You are not signed in. <a href="courierRegister.html">Register or sign in as a courier</a>
              </>
            )}
          </p>

          <ApiError message={error} onRetry={reload} />
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
                  <option key={cart.id} value={String(cart.id)} disabled={cart.needsCharge}>
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
                      <td title={pkg.buildingName}>{pkg.buildingCode}</td>
                      <td>{pkg.lockerId}</td>
                      <td>{Number(pkg.weightLb).toFixed(1) + " lb"}</td>
                      <td>
                        <PriorityBadge priority={pkg.priority} />
                      </td>
                      <td>
                        <StatusBadge status={pkg.displayStatus} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="claim-btn"
                          disabled={busy}
                          onClick={() => claim(pkg.barcode)}
                        >
                          Claim
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                {!loading && queue.length === 0 && (
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
                Deliveries you have claimed (<span id="my-count">{activeCount + " active"}</span>)
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
                        <td title={pkg.buildingName}>{pkg.buildingCode}</td>
                        <td>{pkg.lockerId}</td>
                        <td>
                          <PriorityBadge priority={pkg.priority} />
                        </td>
                        <td>
                          <StatusBadge status={pkg.displayStatus} />
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
                          {pkg.nextStatuses.length > 0 && (
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
                {!loading && mine.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      {courier ? "You haven't claimed any deliveries yet." : "Sign in to see the deliveries you have claimed."}
                    </td>
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
                  <strong>{cart.name}</strong>
                  <BatteryBar level={cart.batteryPercentage} />
                  <span>{cart.batteryPercentage + "%" + (cart.needsCharge ? " - needs charge" : "")}</span>
                </div>
              ))}
            </div>
            <a href="courierUpdate.html#battery-form">Report Battery Status</a>
          </section>
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
          <span id="panel-current">{panelPkg && <StatusBadge status={panelPkg.displayStatus} />}</span>
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

          <button type="submit" disabled={busy}>
            Save Status
          </button>
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
            {pkg.buildingCode + ", " + pkg.buildingName + " | " + pkg.weightLb + " lb | " +
              (pkg.cartName ? pkg.cartName + " (" + pkg.cartBatteryPercentage + "% battery)" : "No cart yet")}
          </p>
          <ol className="timeline">
            {pkg.timeline.map((item, i) => (
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