/**
 * Small toast/snackbar for one-line feedback ("Link copied", "Sign in
 * to save favorites", a failed request) — used by every screen instead
 * of each rolling its own popup.
 */
const Toast = (() => {
  let container = null;
  let hideTimer = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.id = "toast";
    document.body.appendChild(container);
    return container;
  }

  /**
   * @param {string} message
   * @param {{ duration?: number }} [options]
   */
  function show(message, options = {}) {
    const { duration = 2200 } = options;
    const el = ensureContainer();

    el.textContent = message;
    el.classList.add("is-visible");

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => el.classList.remove("is-visible"), duration);
  }

  return { show };
})();
