/*
 * trackingdetail.js
 * Behavior for trackingdetail.html (Phase 2).
 *  - Task 2.1: Package and Vehicle objects, event listeners, state updates without reloads
 *  - Task 2.2: jQuery selectors, injected timeline rows, slide-out panel, animated cart marker
 *
 * The cart simulation stands in for live GPS data until the backend exists in Phase 3.
 */
$(function () {
  "use strict";

  const C = window.CampusEco;
  const UI = window.CampusEcoUI;
  const TICK_MS = 4000; // how often the simulated cart moves to its next waypoint

  // -------------------------------------------------------------------
  // Find the package from the ?barcode= part of the URL
  // -------------------------------------------------------------------
  const requested = new URLSearchParams(window.location.search).get("barcode");
  let pkg;
  if (requested) {
    pkg = C.PackageStore.find(requested);
  } else {
    const mine = C.PackageStore.mine();
    pkg = mine.find(function (p) { return p.status === "En Route"; }) || mine[0];
  }

  if (!pkg) {
    $("#detail-content").prop("hidden", true);
    $("#not-found").prop("hidden", false);
    return;
  }

  const route = pkg.route; // list of waypoints from the hub to the building
  let timer = null;
  let paused = false;

  function save() {
    C.PackageStore.save(pkg);
    UI.updateNavBadge();
  }

  function announce(text) {
    $("#live-status").text(text);
  }

  function percent(value, total) {
    return (value / total * 100).toFixed(3) + "%";
  }

  function buildingLabel(code) {
    return code + ", " + (C.BUILDINGS[code] || code);
  }

  // -------------------------------------------------------------------
  // Package information
  // -------------------------------------------------------------------
  function renderInfo() {
    $("#info-caption").text("Tracking Barcode " + pkg.barcode);
    $("#info-barcode").text(pkg.barcode);
    $("#info-building").text(buildingLabel(pkg.building));
    $("#info-locker").text(pkg.locker);
    $("#info-weight").text(pkg.weightLb + " lb");
    $("#info-priority").text(pkg.priority);
    $("#info-status").empty().append(
      $("<span>").addClass("badge badge-" + C.statusSlug(pkg.status)).text(pkg.status)
    );
  }

  // -------------------------------------------------------------------
  // Real-time location: text panel plus animated marker on the map
  // -------------------------------------------------------------------
  function describeLocation() {
    if (pkg.status === "En Route") {
      return { where: pkg.cart.id + ": " + pkg.currentPoint.where, near: pkg.currentPoint.near };
    }
    if (pkg.status === "Delivered") {
      return { where: "Delivered to " + pkg.locker + " at " + buildingLabel(pkg.building), near: pkg.building };
    }
    if (pkg.status === "Loaded") {
      return { where: "Loaded on " + pkg.cart.id + " at the Central Hub", near: "UP" };
    }
    return { where: "At the Central Hub, waiting to be loaded", near: "UP" };
  }

  // Moves the cart marker. jQuery animates left/top so it glides between waypoints.
  function placeCart(animate) {
    const point = route[Math.min(pkg.routeIndex, route.length - 1)];
    const target = { left: percent(point.x, C.MAP.width), top: percent(point.y, C.MAP.height) };
    const $cart = $("#cart-marker").stop(true);
    const duration = C.animationMs(TICK_MS - 400);
    if (animate && duration > 0) {
      $cart.animate(target, duration, "linear");
    } else {
      $cart.css(target);
    }
  }

  function renderLivePill() {
    const $pill = $("#live-pill").removeClass("pill-live pill-idle pill-done");
    if (pkg.status === "En Route") {
      if (paused) $pill.addClass("pill-idle").text("Paused");
      else $pill.addClass("pill-live").text("Live");
    } else if (pkg.status === "Delivered") {
      $pill.addClass("pill-done").text("Delivered");
    } else {
      $pill.addClass("pill-idle").text("Not moving yet");
    }
    $("#cart-marker").toggleClass("is-moving", pkg.status === "En Route" && !paused);
  }

  function renderLocation(animate) {
    const where = describeLocation();
    $("#loc-where").text(where.where);
    $("#loc-near").text(buildingLabel(where.near));
    $("#loc-updated").text(C.formatDateTime(pkg.lastUpdated, true));
    $("#loc-destination").text(buildingLabel(pkg.building));
    $("#loc-battery").text(pkg.cart.id + ", " + pkg.cart.batteryPct + "% battery");
    $("#cart-marker .marker-label").text(pkg.cart.id);
    placeCart(animate);
    renderLivePill();
  }

  // Draws the route line and the hub and destination markers once.
  function drawRoute() {
    const points = route.map(function (p) { return p.x + "," + p.y; }).join(" ");
    $("#route-layer").html(
      '<svg viewBox="0 0 ' + C.MAP.width + " " + C.MAP.height + '" preserveAspectRatio="none" focusable="false">' +
      '<polyline points="' + points + '"></polyline></svg>'
    );
    const first = route[0];
    const last = route[route.length - 1];
    $("#hub-marker").css({ left: percent(first.x, C.MAP.width), top: percent(first.y, C.MAP.height) });
    $("#dest-marker").css({ left: percent(last.x, C.MAP.width), top: percent(last.y, C.MAP.height) })
      .find(".marker-label").text(pkg.building);
  }

  // -------------------------------------------------------------------
  // Delivery status timeline and progress bar
  // -------------------------------------------------------------------
  function renderTimeline() {
    const $body = $("#timeline-body").empty();
    C.STAGES.forEach(function (stage, i) {
      const at = pkg.timeOf(stage);
      let state = "Pending";
      if (i < pkg.stage || (i === 3 && pkg.status === "Delivered")) state = "Complete";
      else if (i === pkg.stage) state = "Current";

      $("<tr>").attr("role", "row")
        .append($("<td>").attr({ "data-label": "Milestone", role: "cell" }).text(stage))
        .append($("<td>").attr({ "data-label": "Timestamp", role: "cell" }).text(at ? C.formatDateTime(at) : "Not yet"))
        .append($("<td>").attr({ "data-label": "Status", role: "cell" }).append(
          $("<span>").addClass("state state-" + state.toLowerCase()).text(state)
        ))
        .appendTo($body);
    });
    $("#progress-fill").css("width", pkg.progressPct + "%");
    $("#progress").attr("aria-valuenow", pkg.progressPct);
  }

  // -------------------------------------------------------------------
  // Carbon footprint for this delivery
  // -------------------------------------------------------------------
  function renderCarbon() {
    const miles = pkg.milesTravelled;
    $("#carbon-miles").text(miles.toFixed(2) + " mi");
    $("#carbon-avoided").text(C.CarbonCalculator.carMilesAvoided(miles).toFixed(2) + " mi");
    $("#carbon-co2").text(C.CarbonCalculator.co2SavedKg(miles).toFixed(2) + " kg");
  }

  // -------------------------------------------------------------------
  // Receipt sign-off
  // -------------------------------------------------------------------
  const $fields = $("#receipt-fields");
  const $note = $("#receipt-note");
  const $feedback = $("#receipt-feedback");
  const $confirmation = $("#receipt-confirmation");

  function renderReceipt() {
    $feedback.removeClass("error").text("");
    if (pkg.receipt) {
      $fields.prop("disabled", true);
      $note.text("");
      const r = pkg.receipt;
      $confirmation.empty().append(
        $("<p>").append($("<strong>").text("Receipt confirmed.")),
        $("<p>").text("Signed by " + r.name + " on " + C.formatDateTime(r.signedAt) + "."),
        $("<p>").text("Condition: " + (r.condition === "damaged" ? "Damaged" : "Good condition") + (r.notes ? ". Notes: " + r.notes : ""))
      ).prop("hidden", false);
    } else {
      $confirmation.prop("hidden", true).empty();
      if (!pkg.mine) {
        $fields.prop("disabled", true);
        $note.text("Only the person this package is addressed to can sign for it.");
      } else if (pkg.status !== "Delivered") {
        $fields.prop("disabled", true);
        $note.text("You can sign for this package once it has been delivered.");
      } else {
        $fields.prop("disabled", false);
        $note.text("Your package has arrived. Please confirm that you received it.");
      }
    }
  }

  // Damaged packages need a note, so the notes field becomes required.
  $("input[name='condition']").on("change", function () {
    const damaged = $("input[name='condition']:checked").val() === "damaged";
    $("#receipt-notes").prop("required", damaged);
    $("#notes-label").text(damaged ? "Notes (required for damaged packages) *" : "Notes (optional)");
  });

  $("#receipt-form").on("submit", function (event) {
    event.preventDefault(); // no page reload. Native required checks have already passed.
    const name = $.trim($("#recipient-name").val());
    const condition = $("input[name='condition']:checked").val();
    const notes = $.trim($("#receipt-notes").val());

    if (!/^[A-Za-z][A-Za-z .'\-]{1,59}$/.test(name)) {
      $feedback.addClass("error").text("Enter your full name using letters only.");
      $("#recipient-name").trigger("focus");
      return;
    }
    if (condition === "damaged" && notes.length < 5) {
      $feedback.addClass("error").text("Please describe the damage in the notes (at least 5 characters).");
      $("#receipt-notes").trigger("focus");
      return;
    }

    pkg.signFor(name, condition, notes);
    save();
    renderReceipt();
    UI.slideOpen($confirmation);
    announce("Receipt confirmed for package " + pkg.barcode + ".");
  });

  // -------------------------------------------------------------------
  // Cart simulation (one tick every few seconds while the package is En Route)
  // -------------------------------------------------------------------
  function stopSimulation() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startSimulation() {
    stopSimulation();
    if (pkg.status !== "En Route" || paused) return;
    timer = window.setInterval(step, TICK_MS);
  }

  function step() {
    const arrived = pkg.advanceOnRoute();
    save();
    renderAll(true);
    if (arrived) {
      stopSimulation();
      announce("Your package has been delivered to " + buildingLabel(pkg.building) + ". You can now sign for it.");
    } else {
      announce(pkg.cart.id + " is now at " + pkg.currentPoint.where + ".");
    }
  }

  // -------------------------------------------------------------------
  // Demo controls (slide-out panel)
  // -------------------------------------------------------------------
  UI.bindPanelToggle($("#demo-toggle"), $("#demo-panel"), "Show controls", "Hide controls");

  function renderDemoButtons() {
    const labels = {
      "Checked In": "Load onto cart",
      "Awaiting Pickup": "Load onto cart",
      "Loaded": "Start delivery",
      "En Route": "Skip to delivered",
      "Delivered": "Delivered"
    };
    $("#advance-status").text(labels[pkg.status] || "Advance status").prop("disabled", pkg.status === "Delivered");
    $("#sim-toggle")
      .prop("disabled", pkg.status !== "En Route")
      .attr("aria-pressed", paused ? "true" : "false")
      .text(paused ? "Resume cart" : "Pause cart");
  }

  $("#sim-toggle").on("click", function () {
    paused = !paused;
    if (paused) {
      stopSimulation();
    } else {
      startSimulation();
    }
    renderAll(false);
  });

  $("#advance-status").on("click", function () {
    stopSimulation();
    if (pkg.status === "Checked In" || pkg.status === "Awaiting Pickup") {
      pkg.setStatus("Loaded");
    } else if (pkg.status === "Loaded") {
      pkg.setStatus("En Route");
    } else if (pkg.status === "En Route") {
      pkg.setStatus("Delivered");
    }
    save();
    renderAll(true);
    startSimulation();
    announce("Status changed to " + pkg.status + ".");
  });

  $("#reset-package").on("click", function () {
    stopSimulation();
    paused = false;
    pkg.restart();
    save();
    $("#receipt-form")[0].reset();
    renderAll(false);
    announce("This package was restarted from the beginning.");
  });

  // If another tab (for example the courier portal) changes the data, refresh this page.
  $(window).on("storage", function (event) {
    if (event.originalEvent.key !== "campuseco.packages") return;
    const fresh = C.PackageStore.find(pkg.barcode);
    if (fresh) {
      pkg = fresh;
      renderAll(true);
      startSimulation();
    }
  });

  // -------------------------------------------------------------------
  // Start up
  // -------------------------------------------------------------------
  function renderAll(animateMarker) {
    renderInfo();
    renderLocation(animateMarker);
    renderTimeline();
    renderCarbon();
    renderReceipt();
    renderDemoButtons();
  }

  drawRoute();
  renderAll(false);
  startSimulation();
});