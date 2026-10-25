/*
 * Behavior for courier.html, the Eco-Transit Crew dashboard (Phase 2 Deliverables).
 *  - Task 2.1: claim and status changes run through the courier models, with
 *    click, change, keyup, keydown and submit listeners (no page reloads)
 *  - Task 2.2: jQuery selectors, injected table rows, slide-out status panel,
 *    animated battery bars and an animated cart marker on the campus map
 */

$(function () {
  "use strict";

  const C = window.CampusEco;
  const UI = window.CampusEcoUI;
  const K = window.CampusEcoCourier;

  // Converts a map.png pixel position into a CSS percentage (same as trackingdetail.js).
  function percent(value, total) {
    return (value / total) * 100 + "%";
  }

  function priorityBadge(priority) {
    return $("<span>")
      .addClass("badge priority-" + String(priority).toLowerCase())
      .text(priority);
  }

  function statusBadge(status) {
    return $("<span>")
      .addClass("badge badge-" + C.statusSlug(status))
      .text(status);
  }

  // Feedback message above the tables
  const $message = $("#courier-message");
  let messageTimer = null;

  function showMessage(text, type) {
    clearTimeout(messageTimer);
    $message
      .removeClass("is-success is-error")
      .addClass(type === "error" ? "is-error" : "is-success")
      .text(text);
    UI.slideOpen($message);
    messageTimer = setTimeout(function () {
      UI.slideClose($message, 300);
    }, 3500);
  }

  // Greeting and cart dropdown
  function renderGreeting() {
    const courier = K.CourierStore.loadCourier();
    const $greeting = $("#courier-greeting").empty();
    if (courier) {
      $greeting.text(
        "Signed in as " +
          courier.name +
          " (" +
          courier.roleLabel +
          ", " +
          courier.shift +
          " shift)",
      );
    } else {
      $greeting.append(
        "You are using a guest account. ",
        $("<a>")
          .attr("href", "courierRegister.html")
          .text("Register as a courier"),
      );
    }
  }

  function renderCartOptions() {
    const $select = $("#claim-cart-quick");
    const current = $select.val();
    $select.empty();
    K.CourierStore.carts().forEach(function (cart) {
      $("<option>")
        .val(cart.id)
        .text(
          cart.id +
            " (" +
            cart.batteryPct +
            "%" +
            (cart.needsCharge ? ", needs charge" : "") +
            ")",
        )
        .prop("disabled", cart.needsCharge)
        .appendTo($select);
    });
    // Keep the courier's choice if it is still usable, otherwise pick the first charged cart.
    const $usable = $select.find("option:not(:disabled)");
    $select.val(
      $usable.filter(function () {
        return this.value === current;
      }).length
        ? current
        : $usable.first().val(),
    );
  }

  // Route queue: rows are injected from the shared PackageStore
  const $queueBody = $("#queue-body");

  function renderQueue() {
    const queue = K.Dispatch.queue();
    $queueBody.empty();

    queue.forEach(function (pkg, i) {
      $("<tr>")
        .attr("data-barcode", pkg.barcode)
        .append($("<td>").text(i + 1))
        .append($("<td>").text(pkg.barcode))
        .append($("<td>").attr("title", pkg.buildingName).text(pkg.building))
        .append($("<td>").text(pkg.locker))
        .append($("<td>").text(Number(pkg.weightLb).toFixed(1) + " lb"))
        .append($("<td>").append(priorityBadge(pkg.priority)))
        .append($("<td>").append(statusBadge(pkg.status)))
        .append(
          $("<td>").append(
            $("<button>")
              .attr("type", "button")
              .addClass("claim-btn")
              .text("Claim"),
          ),
        )
        .appendTo($queueBody);
    });

    if (queue.length === 0) {
      $queueBody.append(
        $("<tr>").append(
          $("<td>")
            .attr("colspan", 8)
            .text("No deliveries waiting. Nice work!"),
        ),
      );
    }
    $("#queue-count").text(queue.length);
    applyQueueFilter();
  }

  // Search box and priority filter (keyup and change events)
  function applyQueueFilter() {
    const term = $.trim($("#queue-search").val()).toLowerCase();
    const priority = $("#queue-priority").val();

    $queueBody.find("tr[data-barcode]").each(function () {
      const pkg = C.PackageStore.find($(this).data("barcode"));
      const matchesText =
        pkg.barcode.indexOf(term) !== -1 ||
        pkg.building.toLowerCase().indexOf(term) !== -1;
      const matchesPriority = priority === "all" || pkg.priority === priority;
      $(this).toggle(matchesText && matchesPriority);
    });
  }

  $("#queue-search").on("keyup search", applyQueueFilter);
  $("#queue-priority").on("change", applyQueueFilter);

  // Claim button (delegated, because the rows are injected after load)
  $queueBody.on("click", ".claim-btn", function () {
    const $row = $(this).closest("tr");
    const barcode = $row.data("barcode");
    const cartId = $("#claim-cart-quick").val();
    let pkg;

    try {
      pkg = K.Dispatch.claim(barcode, cartId);
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

    // Fade the row out of the queue, then rebuild and flash the new row.
    $row.fadeOut(C.animationMs(300), function () {
      renderQueue();
      renderMyDeliveries();
      renderMapPins();
      $("#my-body tr[data-barcode='" + barcode + "']").addClass("flash");
      showMessage(
        "Claimed " + barcode + " for " + pkg.building + " on " + cartId + ".",
      );
    });
  });

  // My Deliveries
  const $myBody = $("#my-body");

  function renderMyDeliveries() {
    const mine = K.Dispatch.myDeliveries();
    $myBody.empty();

    mine.forEach(function (pkg) {
      const status = K.Dispatch.displayStatus(pkg);
      const $actions = $("<td>").append(
        $("<button>").attr("type", "button").addClass("view-btn").text("View"),
      );
      if (K.Dispatch.nextStatuses(pkg).length) {
        $actions.append(
          " ",
          $("<button>")
            .attr("type", "button")
            .addClass("update-btn")
            .text("Update Status"),
        );
      }

      $("<tr>")
        .attr({ "data-barcode": pkg.barcode, "data-group": pkg.group })
        .append($("<td>").text(pkg.barcode))
        .append($("<td>").attr("title", pkg.buildingName).text(pkg.building))
        .append($("<td>").text(pkg.locker))
        .append($("<td>").append(priorityBadge(pkg.priority)))
        .append($("<td>").append(statusBadge(status)))
        .append($actions)
        .appendTo($myBody);
    });

    if (mine.length === 0) {
      $myBody.append(
        $("<tr>").append(
          $("<td>")
            .attr("colspan", 6)
            .text("You haven't claimed any deliveries yet."),
        ),
      );
    }
    $("#my-count").text(K.Dispatch.activeStops().length + " active");
    applyHideDelivered();
  }

  // "View" slides a details row open under the package.
  $myBody.on("click", ".view-btn", function () {
    const $row = $(this).closest("tr");
    const $existing = $row.next(".details-row");

    if ($existing.length) {
      $existing.find(".details-box").slideUp(C.animationMs(200), function () {
        $existing.remove();
      });
      return;
    }

    const pkg = C.PackageStore.find($row.data("barcode"));
    const $timeline = $("<ol>").addClass("timeline");
    K.Dispatch.timeline(pkg).forEach(function (item) {
      $("<li>")
        .text(
          item.status +
            " - " +
            C.formatDateTime(item.at) +
            (item.notes ? " - " + item.notes : ""),
        )
        .appendTo($timeline);
    });

    const $box = $("<div>")
      .addClass("details-box")
      .hide()
      .append(
        $("<p>").text(
          pkg.building +
            ", " +
            pkg.buildingName +
            " | " +
            pkg.weightLb +
            " lb | " +
            pkg.cart.id +
            " (" +
            pkg.cart.batteryPct +
            "% battery)",
        ),
        $timeline,
      );

    $("<tr>")
      .addClass("details-row")
      .append($("<td>").attr("colspan", 6).append($box))
      .insertAfter($row);
    $box.slideDown(C.animationMs(250));
  });

  // "Hide delivered packages" checkbox
  function applyHideDelivered() {
    const hide = $("#hide-delivered").is(":checked");
    const $delivered = $myBody.find("tr[data-group='delivered']");
    $delivered.toggle(!hide);
    if (hide) $delivered.next(".details-row").remove();
  }

  $("#hide-delivered").on("change", applyHideDelivered);

  // Slide-out status panel
  const $panel = $("#status-panel");
  let panelBarcode = null;

  function openPanel(pkg) {
    panelBarcode = pkg.barcode;
    $("#panel-barcode").text(pkg.barcode);
    $("#panel-current")
      .empty()
      .append(statusBadge(K.Dispatch.displayStatus(pkg)));
    $("#panel-notes").val("");

    // Only offer the statuses that come after the current one.
    const $options = $("#panel-options").empty();
    K.Dispatch.nextStatuses(pkg).forEach(function (status, i) {
      $("<label>")
        .append(
          $("<input>")
            .attr({
              type: "radio",
              name: "panel-status",
              value: status,
              required: true,
            })
            .prop("checked", i === 0),
        )
        .append(" " + status)
        .appendTo($options);
    });

    $panel
      .attr("aria-hidden", "false")
      .stop()
      .animate({ right: 0 }, C.animationMs(300));
    $options.find("input").first().trigger("focus");
  }

  function closePanel() {
    $panel
      .attr("aria-hidden", "true")
      .stop()
      .animate({ right: -($panel.outerWidth() + 20) }, C.animationMs(300));
    panelBarcode = null;
  }

  $myBody.on("click", ".update-btn", function () {
    openPanel(C.PackageStore.find($(this).closest("tr").data("barcode")));
  });

  $("#close-panel").on("click", closePanel);

  $("#panel-form").on("submit", function (event) {
    event.preventDefault(); // stay on the page
    const barcode = panelBarcode;
    let pkg;

    try {
      pkg = K.Dispatch.updateStatus(
        barcode,
        $("input[name='panel-status']:checked").val(),
        $.trim($("#panel-notes").val()),
      );
    } catch (err) {
      showMessage(err.message, "error");
      return;
    }

    closePanel();
    renderMyDeliveries();
    renderMapPins();
    $("#my-body tr[data-barcode='" + barcode + "']").addClass("flash");
    showMessage(barcode + ' is now "' + pkg.status + '".');

    if (pkg.status === "En Route") driveTo(pkg.building);
  });

  // Cart route map: uses the shared routeTo() waypoints from Models.js,
  // so the cart follows the same roads as the End-User tracking map
  const $map = $("#courier-map");
  const $cart = $("#courier-cart");
  const SEGMENT_MS = 350;
  const hub = C.routeTo("AH")[0]; // every route starts at the Central Hub

  function pointCss(point) {
    return {
      left: percent(point.x, C.MAP.width),
      top: percent(point.y, C.MAP.height),
    };
  }

  function renderMapPins() {
    $map.find(".map-pin").remove();
    K.Dispatch.activeStops().forEach(function (pkg, i) {
      const point = C.BUILDING_POINTS[pkg.building];
      if (!point) return;
      $("<div>")
        .addClass("map-pin")
        .attr({
          title: pkg.barcode + " - " + pkg.buildingName,
          "data-building": pkg.building,
        })
        .text(i + 1)
        .css(pointCss(point))
        .hide()
        .appendTo($map)
        .fadeIn(C.animationMs(400));
    });
  }

  function placeCartAtHub() {
    $cart.stop(true).css(pointCss(hub));
  }

  // Queues one animation per waypoint, so the cart glides along the road.
  function queueRoute(points, onArrive) {
    points.forEach(function (point, i) {
      $cart.animate(
        pointCss(point),
        C.animationMs(SEGMENT_MS),
        "linear",
        function () {
          if (point.where) $("#route-status").text(point.where);
          if (i === points.length - 1 && onArrive) onArrive();
        },
      );
    });
  }

  function driveTo(building) {
    placeCartAtHub();
    queueRoute(C.routeTo(building).slice(1));
  }

  $("#start-route").on("click", function () {
    const stops = K.Dispatch.activeStops();
    const $button = $(this);

    if (stops.length === 0) {
      $("#route-status").text("No active deliveries to drive to.");
      return;
    }

    placeCartAtHub();
    $button.prop("disabled", true);
    $map.find(".map-pin").removeClass("visited");

    // Out to each stop and back to the hub, most urgent first.
    stops.forEach(function (pkg, i) {
      const route = C.routeTo(pkg.building);
      queueRoute(route.slice(1), function () {
        $("#route-status").text(
          "Stop " + (i + 1) + ": " + pkg.barcode + " at " + pkg.buildingName,
        );
        $map
          .find(".map-pin[data-building='" + pkg.building + "']")
          .addClass("visited");
      });
      $cart.delay(C.animationMs(600));
      queueRoute(route.slice(0, -1).reverse());
    });

    $cart.queue(function (next) {
      $("#route-status").text("Route complete - back at the Central Hub.");
      $button.prop("disabled", false);
      next();
    });
  });

  $("#reset-route").on("click", function () {
    placeCartAtHub();
    $map.find(".map-pin").removeClass("visited");
    $("#route-status").text("");
    $("#start-route").prop("disabled", false);
  });


  // Battery cards: each bar animates up to its level
  function renderBatteries() {
    const $list = $("#battery-list").empty();
    K.CourierStore.carts().forEach(function (cart) {
      const $fill = $("<div>").addClass("battery-fill").css("width", 0);
      $("<div>")
        .addClass("battery-card battery-" + cart.batteryState)
        .append($("<strong>").text(cart.id))
        .append($("<div>").addClass("battery-bar").append($fill))
        .append(
          $("<span>").text(
            cart.batteryPct + "%" + (cart.needsCharge ? " - needs charge" : ""),
          ),
        )
        .appendTo($list);
      $fill.animate({ width: cart.batteryPct + "%" }, C.animationMs(800));
    });
  }

  // Keyboard shortcuts (native listener, same as tracking.js)
  //  "/" jumps to the queue search, Escape closes the status panel
  document.addEventListener("keydown", function (event) {
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";

    if (event.key === "Escape" && panelBarcode) {
      closePanel();
    } else if (event.key === "/" && !typing) {
      event.preventDefault();
      $("#queue-search").trigger("focus");
    }
  });

  // Reset demo data (packages and courier data)
  $("#courier-reset").on("click", function () {
    if (window.confirm("Reset all demo data in this browser?")) {
      K.resetCourierDemo();
      placeCartAtHub();
      renderAll();
      showMessage("Demo data reset.");
    }
  });

  // Start up
  function renderAll() {
    renderGreeting();
    renderCartOptions();
    renderQueue();
    renderMyDeliveries();
    renderBatteries();
    renderMapPins();
  }

  $("#map-hub").css(pointCss(hub));
  placeCartAtHub();
  $panel.css("right", -($panel.outerWidth() + 20));
  renderAll();
});