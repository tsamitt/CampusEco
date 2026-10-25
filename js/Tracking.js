/*
 * tracking.js
 * Behavior for tracking.html, the End-User dashboard (Phase 2).
 *  - Task 2.1: functions and event listeners (click, input, keydown, submit)
 *  - Task 2.2: jQuery selectors, injected table rows, slide-out panel, animated counters
 */
$(function () {
  "use strict";

  const C = window.CampusEco;
  const UI = window.CampusEcoUI;

  // -------------------------------------------------------------------
  // "Your Packages" table: rows are injected from the stored Package objects
  // -------------------------------------------------------------------
  const $body = $("#packages-body");

  // Builds a table cell. data-label is used by the mobile card layout in CSS.
  function makeCell(label, content) {
    return $("<td>").attr({ "data-label": label, role: "cell" }).append(content);
  }

  function statusBadge(status) {
    return $("<span>").addClass("badge badge-" + C.statusSlug(status)).text(status);
  }

  function renderPackages() {
    $body.empty();
    C.PackageStore.mine().forEach(function (pkg) {
      const detailUrl = "trackingdetail.html?barcode=" + encodeURIComponent(pkg.barcode);
      const needsSignature = pkg.status === "Delivered" && !pkg.receipt;

      const $actions = $("<span>").addClass("row-actions").append(
        $("<a>").addClass("btn btn-small").attr("href", detailUrl).text("View Details")
      );
      if (needsSignature) {
        $actions.append(
          $("<a>").addClass("btn btn-small btn-gold").attr("href", detailUrl + "#receipt-h").text("Sign for Package")
        );
      }

      $("<tr>")
        .attr({ "data-group": pkg.group, role: "row" })
        .append(makeCell("Tracking Barcode", pkg.barcode))
        .append(makeCell("Building", pkg.building))
        .append(makeCell("Locker Array", pkg.locker))
        .append(makeCell("Status", statusBadge(pkg.status)))
        .append(makeCell("Last Updated", C.formatDateTime(pkg.lastUpdated)))
        .append(makeCell("Actions", $actions))
        .appendTo($body);
    });
    applyFilter(currentFilter);
  }

  // -------------------------------------------------------------------
  // Filter buttons: show or hide rows without reloading the page
  // -------------------------------------------------------------------
  let currentFilter = "all";

  function applyFilter(filter) {
    currentFilter = filter;
    const $rows = $body.find("tr");
    $rows.each(function () {
      const show = filter === "all" || $(this).data("group") === filter;
      $(this).toggle(show);
    });
    const visible = $rows.filter(":visible").length;
    $("#packages-count").text("Showing " + visible + " of " + $rows.length + " packages");
    $("#packages-table").toggle(visible > 0);
    $("#packages-empty").prop("hidden", visible > 0);
  }

  $(".chip").on("click", function () {
    $(".chip").attr("aria-pressed", "false");
    $(this).attr("aria-pressed", "true");
    applyFilter($(this).data("filter"));
  });

  // -------------------------------------------------------------------
  // Find a package: input formatting, keyboard shortcut, and submit handler
  // -------------------------------------------------------------------
  const $input = $("#track-barcode");
  const $feedback = $("#search-feedback");
  const $result = $("#search-result");

  // As the user types, keep the barcode in the XXXX-XXXX-XXXX format.
  $input.on("input", function () {
    const formatted = C.formatBarcode(this.value);
    if (this.value !== formatted) this.value = formatted;
    $feedback.removeClass("error success").text("");
  });

  // Native keyboard listener: press "/" anywhere to jump to the search box.
  document.addEventListener("keydown", function (event) {
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";
    if (event.key === "/" && !typing) {
      event.preventDefault();
      $input.trigger("focus");
    }
  });

  $("#search-form").on("submit", function (event) {
    event.preventDefault(); // stay on the page. The browser already checked required and pattern.
    const code = $.trim($input.val());
    const pkg = C.PackageStore.find(code);

    if (!pkg) {
      UI.slideClose($result, 100);
      // .text() is used so whatever was typed is never treated as HTML
      $feedback.removeClass("success").addClass("error")
        .text("No package found for " + code + ". Check the number on your delivery notice and try again.");
      return;
    }

    $feedback.removeClass("error").addClass("success").text("Package found.");
    const detailUrl = "trackingdetail.html?barcode=" + encodeURIComponent(pkg.barcode);
    $result.empty().append(
      $("<p>").addClass("result-title").append($("<strong>").text(pkg.barcode), " ", statusBadge(pkg.status)),
      $("<p>").text("Destination: " + pkg.building + ", " + pkg.buildingName + " (" + pkg.locker + ")"),
      $("<p>").text("Last updated: " + C.formatDateTime(pkg.lastUpdated)),
      $("<a>").addClass("btn").attr("href", detailUrl).text("View Live Tracking")
    );
    UI.slideOpen($result);
  });

  // -------------------------------------------------------------------
  // Impact numbers count up from zero
  // -------------------------------------------------------------------
  function renderImpact() {
    const totals = C.CarbonCalculator.totals(C.PackageStore.all(), C.IMPACT_BASELINE);
    UI.countUp($("#stat-deliveries"), totals.deliveries, 0);
    UI.countUp($("#stat-co2"), totals.co2Kg, 1);
    UI.countUp($("#stat-trees"), totals.trees, 2);
  }

  // -------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------
  function renderNotifications() {
    const seen = new Date(C.Notifications.lastRead());
    const items = C.Notifications.recent(5);
    const $list = $("#notif-list").empty();
    items.forEach(function (n) {
      $("<li>")
        .toggleClass("is-unread", new Date(n.at) > seen)
        .append($("<span>").addClass("notif-time").text(C.formatDateTime(n.at)))
        .append($("<span>").addClass("notif-text").text(n.text))
        .appendTo($list);
    });
    $("#notif-empty").prop("hidden", items.length > 0);
    $("#notif-read").prop("disabled", C.Notifications.unreadCount() === 0);
  }

  $("#notif-read").on("click", function () {
    C.Notifications.markAllRead();
    renderNotifications();
    UI.updateNavBadge();
  });

  // -------------------------------------------------------------------
  // Slide-out panel with a summary of saved delivery preferences
  // -------------------------------------------------------------------
  function renderPrefsSummary() {
    const $list = $("#prefs-summary").empty();
    C.PrefsStore.load().summary().forEach(function (pair) {
      $list.append($("<dt>").text(pair[0]), $("<dd>").text(pair[1]));
    });
  }
  UI.bindPanelToggle($("#prefs-toggle"), $("#prefs-panel"), "Show summary", "Hide summary");

  // -------------------------------------------------------------------
  // Start up
  // -------------------------------------------------------------------
  renderPackages();
  renderImpact();
  renderNotifications();
  renderPrefsSummary();
});