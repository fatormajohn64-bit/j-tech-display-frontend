/**
 * Minimal in-memory screen router. Not hash/URL-based on purpose — an
 * installed PWA has no visible address bar, so there's nothing for a
 * URL to usefully show; a simple stack is enough and keeps this file
 * tiny.
 *
 * Two kinds of screen:
 *  - Tab screens (Home, Search, Categories, Favorites, Profile) — the
 *    5 bottom-nav destinations. Navigating to one resets the stack, so
 *    the back button never "goes back into" a different tab.
 *  - Stack screens (Wallpaper Detail, Settings, Category Detail, ...) —
 *    pushed on top of whatever tab you were on; back pops one off.
 *    The bottom nav hides while a stack screen is on top, matching the
 *    reference mockup (Wallpaper Detail and Settings are full-screen
 *    with their own back arrow, no bottom nav visible).
 */

const Router = (() => {
  const TAB_SCREENS = ["home", "search", "categories", "favorites", "profile"];

  /** @type {Record<string, { element: HTMLElement, controller?: { onEnter?: (params: any) => void|Promise<void> } }>} */
  const screens = {};

  let stack = ["home"];

  /**
   * @param {string} name - Must match a `.screen[data-screen="name"]` element in index.html.
   * @param {{ onEnter?: (params: any) => void|Promise<void> }} [controller] - Registered by that screen's own JS module.
   */
  function register(name, controller) {
    const element = document.querySelector(`.screen[data-screen="${name}"]`);
    if (!element) {
      console.error(`Router.register: no element found for screen "${name}"`);
      return;
    }
    screens[name] = { element, controller };
  }

  function render() {
    const current = stack[stack.length - 1];

    Object.entries(screens).forEach(([name, { element }]) => {
      element.classList.toggle("is-active", name === current);
    });

    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.navTarget === current);
    });

    const bottomNav = document.getElementById("bottom-nav");
    if (bottomNav) bottomNav.style.display = TAB_SCREENS.includes(current) ? "flex" : "none";

    const activeElement = screens[current]?.element;
    if (activeElement) activeElement.scrollTop = 0;
  }

  /**
   * @param {string} name
   * @param {any} [params] - Passed through to that screen's `onEnter`.
   */
  async function navigateTo(name, params = {}) {
    if (!screens[name]) {
      // Not registered by a screen module (yet) — if the section
      // exists in the DOM, register it as a bare placeholder so
      // navigation still works and shows its "Built in a later phase"
      // content, rather than silently doing nothing. Once that screen's
      // real module loads and calls Router.register with a controller,
      // this placeholder registration is simply overwritten.
      const element = document.querySelector(`.screen[data-screen="${name}"]`);
      if (!element) {
        console.error(`Router.navigateTo: unknown screen "${name}"`);
        return;
      }
      screens[name] = { element, controller: undefined };
    }

    stack = TAB_SCREENS.includes(name) ? [name] : [...stack, name];
    render();

    try {
      await screens[name].controller?.onEnter?.(params);
    } catch (error) {
      console.error(`Error entering screen "${name}":`, error);
    }
  }

  function goBack() {
    if (stack.length > 1) {
      stack.pop();
      render();
    }
  }

  function current() {
    return stack[stack.length - 1];
  }

  return { register, navigateTo, goBack, current };
})();
