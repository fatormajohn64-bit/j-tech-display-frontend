/**
 * Minimal bottom sheet: a translucent backdrop + a panel that slides up
 * from the bottom nav area. One instance, reused by whichever screen
 * calls `open()` — callers don't manage their own DOM/backdrop/animation.
 */
const BottomSheet = (() => {
  let backdrop = null;
  let panel = null;

  function ensureDom() {
    if (backdrop) return;
    backdrop = document.createElement("div");
    backdrop.id = "sheet-backdrop";
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });

    panel = document.createElement("div");
    panel.id = "sheet-panel";
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
  }

  /**
   * @param {string} innerHtml - Rendered inside the sheet panel.
   * @param {(panelEl: HTMLElement) => void} [onRender] - Attach listeners, etc.
   */
  function open(innerHtml, onRender) {
    ensureDom();
    panel.innerHTML = innerHtml;
    backdrop.classList.add("is-open");
    if (onRender) onRender(panel);
  }

  function close() {
    if (!backdrop) return;
    backdrop.classList.remove("is-open");
  }

  return { open, close };
})();
