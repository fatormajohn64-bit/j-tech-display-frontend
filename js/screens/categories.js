/**
 * Categories — grid of all configured categories. No wallpaper-count
 * badges here on purpose: the backend doesn't compute real per-category
 * totals (that would mean querying all four providers for every
 * category just to show a number), so rather than invent one, this
 * shows the real thing we do have — the category's name, color, and a
 * tap straight into its live results.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="categories"]');
  let loadedOnce = false;

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function renderTile(category) {
    return `
      <button type="button" class="category-tile" data-category-slug="${escapeHtml(category.slug)}"
              style="background: linear-gradient(135deg, ${category.display.color}66, ${category.display.color}0D), var(--color-surface);">
        <span class="category-tile-name">${escapeHtml(category.name)}</span>
      </button>
    `;
  }

  async function load() {
    element.innerHTML = `
      <div class="screen-content">
        <h1 class="screen-title">Categories</h1>
        <div class="category-grid" id="category-grid">
          ${Array.from({ length: 8 }).map(() => `<div class="category-tile is-skeleton"></div>`).join("")}
        </div>
      </div>
    `;

    try {
      const { items } = await Api.getCategories();
      const grid = element.querySelector("#category-grid");
      grid.innerHTML = items.map(renderTile).join("");
      grid.addEventListener("click", (event) => {
        const tile = event.target.closest("[data-category-slug]");
        if (tile) Router.navigateTo("category-detail", { slug: tile.dataset.categorySlug });
      });
    } catch (error) {
      element.querySelector(".screen-content").innerHTML += `
        <div class="state-block">
          <div class="state-title">Couldn't load categories</div>
          <div>${escapeHtml(error.message)}</div>
          <button type="button" class="state-retry" id="categories-retry">Try again</button>
        </div>
      `;
      element.querySelector("#categories-retry").addEventListener("click", load);
    }
  }

  function onEnter() {
    if (loadedOnce) return;
    loadedOnce = true;
    load();
  }

  Router.register("categories", { onEnter });
})();
