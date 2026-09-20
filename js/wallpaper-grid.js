/**
 * The 2-column masonry grid (`.wallpaper-grid` / `.wallpaper-card` in
 * screens.css) is used identically by Search, Category Detail, and
 * Favorites — same card markup, same "tap to open detail, tap heart to
 * favorite" behavior. Centralized here so that behavior is only
 * implemented once.
 */
const WallpaperGrid = (() => {
  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  /**
   * @param {import("../services/normalize.js").NormalizedWallpaper} wallpaper
   * @param {{ favorited?: boolean }} [options]
   * @returns {string}
   */
  function renderCard(wallpaper, options = {}) {
    const title = wallpaper.title || "Wallpaper";
    return `
      <div class="wallpaper-card" data-wallpaper-id="${escapeHtml(wallpaper.id)}">
        <img src="${escapeHtml(wallpaper.thumbnail_url || wallpaper.image_url)}" alt="${escapeHtml(title)}" loading="lazy" />
        <button type="button" class="wallpaper-card-favorite${options.favorited ? " is-favorited" : ""}" data-action="favorite">
          ${Icons.heart}
        </button>
      </div>
    `;
  }

  function renderSkeletons(count) {
    return Array.from({ length: count }).map(() => `<div class="wallpaper-card is-skeleton"></div>`).join("");
  }

  /**
   * Wires click delegation on a grid container. Call once per
   * container; safe to call again after re-rendering the same
   * container's innerHTML since it's delegated, not per-card.
   *
   * @param {HTMLElement} containerEl
   * @param {Object} handlers
   * @param {(id: string) => (object|undefined)} handlers.findWallpaper - Looks up the full wallpaper object for a card's id from the caller's own state.
   * @param {(wallpaper: object) => void} [handlers.onRemoved] - Called after a successful un-favorite (e.g. so Favorites can drop the card from its list).
   */
  function attach(containerEl, { findWallpaper, onRemoved }) {
    containerEl.addEventListener("click", (event) => {
      const card = event.target.closest(".wallpaper-card[data-wallpaper-id]");
      if (!card) return;
      const wallpaper = findWallpaper(card.dataset.wallpaperId);
      if (!wallpaper) return;

      const favoriteBtn = event.target.closest('[data-action="favorite"]');
      if (favoriteBtn) {
        toggleFavorite(wallpaper, favoriteBtn, onRemoved);
        return;
      }

      Router.navigateTo("wallpaper-detail", { id: wallpaper.id, wallpaper });
    });
  }

  async function toggleFavorite(wallpaper, buttonEl, onRemoved) {
    if (!AppAuth.getCurrentUser()) {
      Toast.show("Sign in to save favorites");
      return;
    }
    const wasFavorited = buttonEl.classList.contains("is-favorited");
    buttonEl.classList.toggle("is-favorited", !wasFavorited);

    try {
      if (wasFavorited) {
        await Api.removeFavorite(wallpaper.id);
        Toast.show("Removed from favorites");
        if (onRemoved) onRemoved(wallpaper);
      } else {
        await Api.addFavorite(wallpaper);
        Toast.show("Added to favorites");
      }
    } catch (error) {
      buttonEl.classList.toggle("is-favorited", wasFavorited);
      Toast.show(error.message || "Something went wrong");
    }
  }

  return { renderCard, renderSkeletons, attach };
})();
