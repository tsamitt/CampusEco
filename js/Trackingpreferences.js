/*
 * trackingpreferences.js
 * Behavior for trackingpreferences.html (Phase 2).
 *  - Task 2.1: Preferences object, submit/change/input handlers, saved to localStorage
 *  - Task 2.2: jQuery selectors, show/hide of the phone field, fading confirmation message
 */
$(function () {
  "use strict";

  const C = window.CampusEco;
  const UI = window.CampusEcoUI;

  const $form = $("#prefs-form");
  const $feedback = $("#prefs-feedback");
  const $toast = $("#prefs-toast");
  const $phoneField = $("#phone-field");
  const $phone = $("#phone");
  const $building = $("#pref-building");

  // Fill the building suggestions from the campus building list.
  Object.keys(C.BUILDINGS).sort().forEach(function (code) {
    $("<option>").val(code).text(C.BUILDINGS[code]).appendTo("#building-list");
  });

  // Put saved values into the form controls.
  function fillForm(prefs) {
    $("#notify-email").prop("checked", prefs.notifyEmail);
    $("#notify-text").prop("checked", prefs.notifyText);
    $phone.val(prefs.phone);
    $("#delivery-window").val(prefs.window);
    $building.val(prefs.building);
    $("input[name='fallback'][value='" + prefs.fallback + "']").prop("checked", true);
    $("#signature-on-file").prop("checked", prefs.signatureOnFile);
    syncPhoneField(false);
    showBuildingName();
  }

  // Read the form back into a Preferences object.
  function readForm() {
    return new C.Preferences({
      notifyEmail: $("#notify-email").is(":checked"),
      notifyText: $("#notify-text").is(":checked"),
      phone: $.trim($phone.val()),
      window: $("#delivery-window").val(),
      building: $.trim($building.val()).toUpperCase(),
      fallback: $("input[name='fallback']:checked").val(),
      signatureOnFile: $("#signature-on-file").is(":checked")
    });
  }

  // The phone field only appears (and is only required) when text messages are chosen.
  function syncPhoneField(animate) {
    const wantsText = $("#notify-text").is(":checked");
    $phone.prop("required", wantsText);
    if (wantsText) {
      if ($phoneField.prop("hidden")) animate ? UI.slideOpen($phoneField) : $phoneField.prop("hidden", false);
    } else if (!$phoneField.prop("hidden")) {
      animate ? UI.slideClose($phoneField) : $phoneField.prop("hidden", true);
    }
  }
  $("#notify-text").on("change", function () { syncPhoneField(true); });

  // Auto-uppercase the building code and show its full name.
  function showBuildingName() {
    const code = $.trim($building.val()).toUpperCase();
    const name = C.BUILDINGS[code];
    $("#building-name").text(code.length === 2 ? (name ? code + " is " + name + "." : "Unknown building code.") : "");
    $building[0].setCustomValidity(code.length === 2 && !name ? "That building code is not on the campus map." : "");
  }
  $building.on("input", function () {
    this.value = this.value.replace(/[^A-Za-z]/g, "").toUpperCase();
    showBuildingName();
  });

  $form.on("submit", function (event) {
    event.preventDefault(); // stay on the page. The browser already checked pattern and required.
    const prefs = readForm();
    $feedback.removeClass("error").text("");

    if (!prefs.notifyEmail && !prefs.notifyText) {
      $feedback.addClass("error").text("Choose at least one way to be notified.");
      $("#notify-email").trigger("focus");
      return;
    }

    C.PrefsStore.save(prefs);
    $toast.stop(true, true).prop("hidden", false).hide().fadeIn(C.animationMs(200))
      .delay(2500).fadeOut(C.animationMs(400), function () { $toast.prop("hidden", true); });
  });

  $("#prefs-reset").on("click", function () {
    C.PrefsStore.reset();
    fillForm(C.PrefsStore.load());
    $feedback.removeClass("error").text("");
    $toast.stop(true, true).prop("hidden", true);
  });

  fillForm(C.PrefsStore.load());
});