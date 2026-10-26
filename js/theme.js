/* CampusEco sitewide theme switch. Does not modify portal data or handlers. */
(function () {
  'use strict';
  function init() {
    var nav = document.querySelector('header nav');
    if (!nav || document.getElementById('campuseco-theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'campuseco-theme-toggle';
    button.className = 'campuseco-theme-toggle';
    function update() {
      var dark = document.documentElement.dataset.theme === 'dark';
      button.textContent = dark ? '☀ Light mode' : '☾ Dark mode';
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('aria-pressed', String(dark));
    }
    button.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('campuseco-theme', next); } catch (e) {}
      update();
    });
    nav.appendChild(button);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
