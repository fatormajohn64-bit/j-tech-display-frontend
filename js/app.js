/**
 * App entry point. Runs after every other script has loaded (see the
 * script order in index.html), wires up the parts that are global to
 * the whole app shell, and hands off to the router.
 *
 * Individual screens register themselves with Router.register(...) in
 * their own files (screens/home.js, screens/search.js, etc., added in
 * later phases) — this file never knows screen-specific details.
 */

document.addEventListener("DOMContentLoaded", () => {
  wireBottomNav();
  wireGlobalBackButtons();
  registerServiceWorker();

  // Screens that exist register themselves before this fires (script
  // tags for screens/*.js are loaded before app.js in index.html).
  Router.navigateTo("home");
});

function wireBottomNav() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.navTarget;
      if (target) Router.navigateTo(target);
    });
  });
}

/**
 * Any element anywhere with data-action="back" pops the current stack
 * screen — used by the back arrow on Wallpaper Detail, Settings, etc.
 */
function wireGlobalBackButtons() {
  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest('[data-action="back"]');
    if (trigger) Router.goBack();
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
