/*
 * Behavior for courierUpdate.html: claim, transit milestone and battery forms (Phase 2 Deliverables).
 *  - Task 2.1: submit handlers update the shared packages and the cart fleet
 *    through the courier models, with live input and keyup feedback
 *  - Task 2.2: jQuery selectors, injected datalist and cart options,
 *    sliding messages and an animated battery preview bar
 */
$(function () {
  "use strict";

  const C = window.CampusEco;
  const UI = window.CampusEcoUI;
  const K = window.CampusEcoCourier;

  // Shows a message under a form, then slides it away.
  function showFormMessage($el, text, type) {
    clearTimeout($el.data("timer"));
    $el
      .removeClass("is-success is-error")
      .addClass(type === "error" ? "is-error" : "is-success")
      .text(text);
    UI.slideOpen($el);
    $el.data(
      "timer",
      setTimeout(function () {
        UI.slideClose($el, 300);
      }, 4000),
    );
  }

  // Suggestions and dropdowns built from the current data
  function refreshBarcodeLists() {
    const $queueList = $("#queue-barcodes").empty();
    K.Dispatch.queue().forEach(function (pkg) {
      $("<option>")
        .val(pkg.barcode)
        .text(pkg.building + " - " + pkg.priority)
        .appendTo($queueList);
    });

    const $myList = $("#my-barcodes").empty();
    K.Dispatch.activeStops().forEach(function (pkg) {
      $("<option>")
        .val(pkg.barcode)
        .text(pkg.building + " - " + K.Dispatch.displayStatus(pkg))
        .appendTo($myList);
    });
  }

  function refreshCartOptions() {
    const $claimCart = $("#claim-cart");
    const $batteryCart = $("#battery-cart");
    $claimCart.find("option:not(:first)").remove();
    $batteryCart.find("option:not(:first)").remove();

    K.CourierStore.carts().forEach(function (cart) {
      const label =
        cart.id +
        " (" +
        cart.batteryPct +
        "%" +
        (cart.needsCharge ? ", needs charge" : "") +
        ")";
      // A cart that needs charging can't be claimed, but it can still be reported on.
      $("<option>")
        .val(cart.id)
        .text(label)
        .prop("disabled", cart.needsCharge)
        .appendTo($claimCart);
      $("<option>").val(cart.id).text(label).appendTo($batteryCart);
    });
  }

  // Keep barcodes in the XXXX-XXXX-XXXX format while typing (same helper as tracking.js).
  $("#claim-barcode, #status-barcode").on("input", function () {
    const formatted = C.formatBarcode(this.value);
    if (this.value !== formatted) this.value = formatted;
  });

  // 1. Claim a Delivery
  const $claimForm = $("#claim-form");
  const $claimInfo = $("#claim-info");

  // Looks the barcode up as it is typed and pre-fills the hub weight.
  $("#claim-barcode").on("input", function () {
    const barcode = $.trim($(this).val());

    if (!K.isValidBarcode(barcode)) {
      $claimInfo.text("");
      return;
    }

    const pkg = C.PackageStore.find(barcode);
    if (!pkg) {
      $claimInfo.text("No package with that barcode is checked in at the hub.");
    } else if (!K.Dispatch.isQueued(pkg)) {
      $claimInfo.text(
        "Not in the route queue (" + K.Dispatch.displayStatus(pkg) + ").",
      );
    } else {
      $claimInfo.text(
        pkg.building +
          ", " +
          pkg.locker +
          " - " +
          pkg.priority +
          " - hub weight " +
          pkg.weightLb +
          " lb",
      );
      $("#claim-weight").val(pkg.weightLb);
    }
  });

  $claimForm.on("submit", function (event) {
    event.preventDefault(); // stay on the page. The browser already checked required and pattern.

    const barcode = $.trim($("#claim-barcode").val());
    const cartId = $("#claim-cart").val();
    const weight = parseFloat($("#claim-weight").val());
    let pkg;

    try {
      pkg = K.Dispatch.claim(barcode, cartId, weight);
    } catch (err) {
      showFormMessage($("#claim-message"), err.message, "error");
      return;
    }

    showFormMessage(
      $("#claim-message"),
      "Claimed " + barcode + " for " + pkg.building + " on " + cartId + ".",
    );
    this.reset();
    $claimInfo.text("");
    refreshBarcodeLists();
  });

  $claimForm.on("reset", function () {
    $claimInfo.text("");
  });

  // 2. Update Transit Milestone
  const $statusForm = $("#status-form");
  const $statusRadios = $("input[name='status']");
  const $statusInfo = $("#status-info");

  // Only enable the statuses that make sense for the typed barcode.
  function updateStatusOptions() {
    const barcode = $.trim($("#status-barcode").val());
    const pkg = K.isValidBarcode(barcode) ? C.PackageStore.find(barcode) : null;

    if (!pkg) {
      $statusRadios.prop("disabled", false);
      $statusInfo.text(
        K.isValidBarcode(barcode) ? "No package with that barcode." : "",
      );
      return;
    }
    if (!K.Dispatch.isMine(pkg)) {
      $statusRadios.prop({ disabled: true, checked: false });
      $statusInfo.text("Claim this package before updating its status.");
      return;
    }

    const allowed = K.Dispatch.nextStatuses(pkg);
    $statusRadios.each(function () {
      const ok = allowed.indexOf(this.value) !== -1;
      $(this).prop("disabled", !ok);
      if (!ok) $(this).prop("checked", false);
    });
    $statusInfo.text(
      "Current status: " +
        K.Dispatch.displayStatus(pkg) +
        (allowed.length ? "" : " (complete)"),
    );
  }

  $("#status-barcode").on("input", updateStatusOptions);

  // Live character counter for the notes box (keyboard event).
  $("#status-notes").on("keyup input", function () {
    const length = $(this).val().length;
    $("#notes-count")
      .text(length + " / 250")
      .toggleClass("is-near-limit", length > 230);
  });

  $statusForm.on("submit", function (event) {
    event.preventDefault();

    const barcode = $.trim($("#status-barcode").val());
    const newStatus = $statusRadios.filter(":checked").val();

    if (!newStatus) {
      showFormMessage($("#status-message"), "Pick a new status.", "error");
      return;
    }

    try {
      K.Dispatch.updateStatus(
        barcode,
        newStatus,
        $.trim($("#status-notes").val()),
      );
    } catch (err) {
      showFormMessage($("#status-message"), err.message, "error");
      return;
    }

    showFormMessage(
      $("#status-message"),
      barcode + ' updated to "' + newStatus + '".',
    );
    this.reset();
    $("#notes-count").text("0 / 250").removeClass("is-near-limit");
    $statusInfo.text("");
    $statusRadios.prop("disabled", false);
    refreshBarcodeLists();
  });

  // 3. Report Battery Status
  const $batteryForm = $("#battery-form");
  const $preview = $("#battery-preview");
  const $previewFill = $preview.find(".battery-fill");
  const $previewText = $("#battery-preview-text");

  function resetPreview() {
    $previewFill.stop(true).css("width", 0);
    $preview
      .removeClass("battery-low battery-critical")
      .addClass("battery-good");
    $previewText.text("Enter a level to preview");
  }

  // Shows the cart's last report when one is picked.
  $("#battery-cart").on("change", function () {
    const cart = K.CourierStore.findCart($(this).val());
    $("#battery-last").text(
      cart
        ? "Last report: " +
            cart.batteryPct +
            "% (" +
            C.formatDateTime(cart.lastReportAt) +
            ")"
        : "",
    );
  });

  // Live preview of the battery bar while typing.
  $("#battery-level").on("input", function () {
    const raw = $(this).val();
    const level = Number(raw);

    if (raw === "" || level < 0 || level > 100) {
      $previewFill.stop(true).animate({ width: 0 }, C.animationMs(200));
      $previewText.text("Enter a level between 0 and 100");
      return;
    }

    // Re-use the EcoCart model to decide the colour.
    const state = new K.EcoCart({ id: "preview", batteryPct: level })
      .batteryState;
    $preview
      .removeClass("battery-good battery-low battery-critical")
      .addClass("battery-" + state);
    $previewFill.stop(true).animate({ width: level + "%" }, C.animationMs(250));
    $previewText.text(level + "% - " + state);

    // Below 20% the cart needs charging, so tick that box for the courier.
    if (level < 20)
      $("input[name='issue'][value='charge']").prop("checked", true);
  });

  $batteryForm.on("submit", function (event) {
    event.preventDefault();

    const issues = $("input[name='issue']:checked")
      .map(function () {
        return this.value;
      })
      .get();
    let cart;

    try {
      cart = K.Dispatch.reportBattery(
        $("#battery-cart").val(),
        $("#battery-level").val(),
        $("input[name='report-type']:checked").val(),
        issues,
      );
    } catch (err) {
      showFormMessage($("#battery-message"), err.message, "error");
      return;
    }

    const warning = cart.needsCharge
      ? " This cart is now marked as needing a charge."
      : "";
    showFormMessage(
      $("#battery-message"),
      cart.id + " battery saved at " + cart.batteryPct + "%." + warning,
      cart.needsCharge ? "error" : "success",
    );
    this.reset();
    $("#battery-last").text("");
    resetPreview();
    refreshCartOptions();
  });

  // Start up
  refreshBarcodeLists();
  refreshCartOptions();
});