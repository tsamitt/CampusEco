/*
 * common.js
 * jQuery helpers shared by all three End-User pages (Phase 2, Task 2.2).
 * Load order: jquery, models.js, common.js, then the page script.
 */
(function (window, $) {
  "use strict";

  const C = window.CampusEco;

  // Shows a hidden element with a slide animation.
  function slideOpen($el, ms) {
    $el.stop(true, true).prop("hidden", false).hide().slideDown(C.animationMs(ms === undefined ? 200 : ms));
  }

  // Hides an element with a slide animation, then marks it hidden.
  function slideClose($el, ms) {
    $el.stop(true, true).slideUp(C.animationMs(ms === undefined ? 200 : ms), function () {
      $el.prop("hidden", true);
    });
  }

  // Wires a button to open and close a slide-out panel (keeps aria-expanded in sync).
  function bindPanelToggle($button, $panel, openLabel, closeLabel) {
    $button.on("click", function () {
      const isOpen = $button.attr("aria-expanded") === "true";
      if (isOpen) {
        slideClose($panel);
        $button.attr("aria-expanded", "false").text(openLabel);
      } else {
        slideOpen($panel);
        $button.attr("aria-expanded", "true").text(closeLabel);
      }
    });
  }

  // Animates a number from 0 up to its target value.
  function countUp($el, target, decimals) {
    const places = decimals || 0;
    if (C.animationMs(1) === 0) {
      $el.text(target.toFixed(places));
      return;
    }
    $({ value: 0 }).animate({ value: target }, {
      duration: 900,
      easing: "swing",
      step: function (now) { $el.text(now.toFixed(places)); },
      complete: function () { $el.text(target.toFixed(places)); }
    });
  }

  // Unread notification count shown next to "My Packages" in the nav.
  function updateNavBadge() {
    const unread = C.Notifications.unreadCount();
    const $badge = $("#nav-unread");
    if (unread > 0) {
      $badge.text(unread).attr("aria-label", unread + " unread notifications").prop("hidden", false);
    } else {
      $badge.prop("hidden", true);
    }
  }

  $(function () {
    updateNavBadge();

    // Footer button: clears the demo data in this browser.
    $("#reset-demo").on("click", function () {
      if (window.confirm("Reset all demo data in this browser?")) {
        C.resetDemo();
        window.location.href = "tracking.html";
      }
    });
  });

  window.CampusEcoUI = {
    slideOpen: slideOpen,
    slideClose: slideClose,
    bindPanelToggle: bindPanelToggle,
    countUp: countUp,
    updateNavBadge: updateNavBadge
  };
})(window, window.jQuery);