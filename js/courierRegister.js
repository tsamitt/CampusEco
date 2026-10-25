/*
 * Behavior for courierRegister.html (Phase 2 Deliverables).
 *  - Task 2.1: builds an EcoCourier object from the form and saves it to localStorage,
 *    with input, keyup, change, click and submit listeners
 *  - Task 2.2: jQuery selectors, password strength meter, show/hide password,
 *    sliding success and signed-in panels
 */

$(function () {
  "use strict";

  const UI = window.CampusEcoUI;
  const K = window.CampusEcoCourier;

  const $form = $("#register-form");
  const $formSection = $("#register-section");
  const $success = $("#register-success");
  const $current = $("#current-courier");
  const $email = $("#reg-email");
  const $password = $("#reg-password");

  // Signed-in banner
  function renderCurrentCourier() {
    const courier = K.CourierStore.loadCourier();
    if (courier) {
      $("#current-courier-text").text(
        "Signed in as " + courier.name + " (" + courier.email + "). ",
      );
      UI.slideOpen($current);
    } else {
      UI.slideClose($current);
    }
  }

  // Email: custom rule on top of type="email" (must be an @mnsu.edu address)
  $email.on("input", function () {
    const email = $.trim(this.value);
    const ok = email === "" || K.EcoCourier.isMnsuEmail(email);
    this.setCustomValidity(
      ok ? "" : "Please use your @mnsu.edu email address.",
    );
    $("#email-hint")
      .text(ok ? "Use your @mnsu.edu address" : "Must end in @mnsu.edu")
      .toggleClass("is-error-text", !ok);
  });

  // Password strength meter (keyboard event)
  const STRENGTH = [
    { label: "Too short", color: "#d33" },
    { label: "Weak", color: "#d33" },
    { label: "Fair", color: "#e0a100" },
    { label: "Good", color: "#e0a100" },
    { label: "Strong", color: "#2e9e45" },
    { label: "Very strong", color: "#2e9e45" },
  ];

  // Scores a password from 0 to 5.
  function scorePassword(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function resetStrength() {
    $("#strength-fill").stop(true).css("width", 0);
    $("#strength-text").text("At least 8 characters");
  }

  $password.on("keyup input", function () {
    const pw = $(this).val();
    const score = scorePassword(pw);

    $("#strength-fill")
      .css("background-color", STRENGTH[score].color)
      .stop(true)
      .animate(
        { width: (score / 5) * 100 + "%" },
        window.CampusEco.animationMs(200),
      );
    $("#strength-text").text(
      pw.length < 8 ? "At least 8 characters" : STRENGTH[score].label,
    );
  });

  // Show / hide password (click)
  $("#toggle-password").on("click", function () {
    const hidden = $password.attr("type") === "password";
    $password.attr("type", hidden ? "text" : "password");
    $(this)
      .text(hidden ? "Hide" : "Show")
      .attr("aria-pressed", String(hidden));
  });

  // Role hint (change)
  $("input[name='role']").on("change", function () {
    const sample = new K.EcoCourier({ role: this.value });
    $("#role-hint").text(
      sample.roleLabel +
        "s can carry up to " +
        sample.maxLoadLb +
        " lb per load.",
    );
  });

  // Submit: create and save the EcoCourier
  $form.on("submit", function (event) {
    event.preventDefault(); // stay on the page. The browser already checked the required fields.

    const courier = new K.EcoCourier({
      name: $.trim($("#reg-name").val()),
      email: $.trim($email.val()).toLowerCase(),
      shift: $("#reg-shift").val(),
      role: $("input[name='role']:checked").val(),
    });
    K.CourierStore.saveCourier(courier);

    $("#register-success-text").text(
      "Welcome, " +
        courier.firstName +
        "! You're registered as a " +
        courier.roleLabel +
        " on the " +
        courier.shift +
        " shift.",
    );
    UI.slideClose($formSection, 300);
    UI.slideOpen($success, 300);
    renderCurrentCourier();
  });

  // Sign out
  $("#sign-out").on("click", function () {
    K.CourierStore.clearCourier();
    $form[0].reset();
    resetStrength();
    $("#role-hint").text("");
    UI.slideClose($success);
    UI.slideOpen($formSection, 300);
    renderCurrentCourier();
  });

  // Start up
  renderCurrentCourier();
});