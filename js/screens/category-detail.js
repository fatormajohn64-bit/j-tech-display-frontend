/**
 * Category Detail — pushed from a category chip/tile/suggestion row.
 * Same infinite-scroll grid pattern as Search's wallpaper results, fed
 * by GET /api/categories/:slug instead of /api/search.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="category-detail"]');

  const state = {
    slug: null,
    category: null,
    items: [],
    page: 1,
    hasNext: false,
    isLoading: false,
  };

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function renderShell() {
    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="category-detail-header">
          <button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button>
          <span class="chip-dot" style="background:${escapeHtml(state.category.display.color)}"></span>
          <span class="category-detail-title">${escapeHtml(state.category.name)}</span>
        </div>
        <div class="wallpaper-grid" id="category-grid">${WallpaperGrid.renderSkeletons(6)}</div>
      </div>
    `;

    const grid = element.querySelector("#category-grid");
    WallpaperGrid.attach(grid, { findWallpaper: (id) => state.items.find((item) => item.id === id) });
    element.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 600;
    if (nearBottom && !state.isLoading && state.hasNext) loadPage();
  }

  async function loadPage() {
    state.isLoading = true;
    try {
      const result = await Api.getCategoryWallpapers(state.slug, { page: state.page, limit: 20 });
      state.items = state.page === 1 ? result.items : [...state.items, ...result.items];
      state.hasNext = result.pagination.has_next;
      state.page += 1;
      renderGrid();
    } catch (error) {
      Toast.show(error.message || "Couldn't load this category");
    } finally {
      state.isLoading = false;
    }
  }

  function renderGrid() {
    const grid = element.querySelector("#category-grid");
    if (state.items.length === 0) {
      grid.outerHTML = `<div class="state-block"><div class="state-title">No wallpapers found</div></div>`;
      return;
    }
    grid.innerHTML = state.items.map((w) => WallpaperGrid.renderCard(w)).join("");
  }

  async function onEnter(params = {}) {
    if (!params.slug) return;

    const isSameCategory = state.slug === params.slug;
    state.slug = params.slug;
    state.page = 1;
    if (!isSameCategory) state.items = [];

    // Show a loading state immediately rather than fetching the
    // category's display info first — otherwise the previous screen's
    // stale content would sit visible for however long that fetch takes.
    state.category = { name: params.slug, display: { color: "#666" } };
    renderShell();

    try {
      const { items } = await Api.getCategories();
      const match = items.find((c) => c.slug === params.slug);
      if (match) {
        state.category = match;
        const titleEl = element.querySelector(".category-detail-title");
        const dotEl = element.querySelector(".category-detail-header .chip-dot");
        if (titleEl) titleEl.textContent = match.name;
        if (dotEl) dotEl.style.background = match.display.color;
      }
    } catch {
      // Keep the slug-derived fallback name — non-critical, the grid below still loads.
    }

    await loadPage();
  }

  Router.register("category-detail", { onEnter });
})();
