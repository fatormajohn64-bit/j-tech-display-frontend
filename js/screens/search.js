/**
 * Search — text query with debounced live results. Category name
 * matches (client-side, against the already-small category list) show
 * as suggestion rows above the wallpaper grid; the segmented control
 * filters which of the two sections is visible.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="search"]');

  const state = {
    query: "",
    activeTab: "all", // all | wallpapers | categories
    categories: [],
    matchingCategories: [],
    items: [],
    page: 1,
    hasNext: false,
    isLoading: false,
    loadedOnce: false,
    requestToken: 0,
  };

  let debounceTimer = null;
  let resultsEl = null;

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function renderShell() {
    element.innerHTML = `
      <div class="screen-content">
        <div class="search-topbar">
          <label class="search-field search-field-input">
            ${Icons.search}
            <input type="search" id="search-input" placeholder="Search wallpapers..." autocomplete="off" />
          </label>
          <button type="button" class="search-cancel" id="search-cancel">Cancel</button>
        </div>

        <div class="tab-row" id="search-tabs">
          <button type="button" class="tab-btn is-active" data-tab="all">All</button>
          <button type="button" class="tab-btn" data-tab="wallpapers">Wallpapers</button>
          <button type="button" class="tab-btn" data-tab="categories">Categories</button>
        </div>

        <div id="search-results"></div>
      </div>
    `;

    resultsEl = element.querySelector("#search-results");
    const input = element.querySelector("#search-input");

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(input.value), 350);
    });

    element.querySelector("#search-cancel").addEventListener("click", () => {
      input.value = "";
      Router.navigateTo("home");
    });

    element.querySelector("#search-tabs").addEventListener("click", (event) => {
      const tabBtn = event.target.closest(".tab-btn");
      if (!tabBtn) return;
      state.activeTab = tabBtn.dataset.tab;
      element.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("is-active", btn === tabBtn));
      renderResults();
    });

    resultsEl.addEventListener("click", (event) => {
      const categoryRow = event.target.closest("[data-category-slug]");
      if (categoryRow) {
        Router.navigateTo("category-detail", { slug: categoryRow.dataset.categorySlug });
      }
    });

    WallpaperGrid.attach(resultsEl, { findWallpaper: (id) => state.items.find((item) => item.id === id) });

    element.addEventListener("scroll", onScroll, { passive: true });

    Api.getCategories()
      .then(({ items }) => (state.categories = items))
      .catch((error) => console.error("Failed to load categories for search:", error.message));
  }

  function onScroll() {
    if (state.activeTab === "categories" || state.isLoading || !state.hasNext) return;
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 600;
    if (nearBottom) runSearch(state.query, { nextPage: true });
  }

  async function runSearch(rawQuery, { nextPage = false } = {}) {
    const query = rawQuery.trim();
    state.query = query;

    if (!query) {
      state.items = [];
      state.matchingCategories = [];
      renderResults();
      return;
    }

    if (!nextPage) {
      state.page = 1;
      state.matchingCategories = state.categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    }

    const myToken = ++state.requestToken;
    state.isLoading = true;
    if (!nextPage) renderResults(true);

    try {
      const result = await Api.search(query, { page: state.page, limit: 20 });
      if (myToken !== state.requestToken) return; // a newer keystroke superseded this request

      state.items = nextPage ? [...state.items, ...result.items] : result.items;
      state.hasNext = result.pagination.has_next;
      state.page += 1;
    } catch (error) {
      if (myToken !== state.requestToken) return;
      Toast.show(error.message || "Search failed");
    } finally {
      if (myToken === state.requestToken) {
        state.isLoading = false;
        renderResults();
      }
    }
  }

  function renderResults(showSkeleton = false) {
    if (!state.query) {
      resultsEl.innerHTML = `
        <div class="state-block">
          <div class="state-title">Find your next wallpaper</div>
          <div>Search by mood, subject, or color — try "sunset", "anime", or "minimal".</div>
        </div>
      `;
      return;
    }

    const showCategories = state.activeTab === "all" || state.activeTab === "categories";
    const showWallpapers = state.activeTab === "all" || state.activeTab === "wallpapers";

    let html = "";

    if (showCategories && state.matchingCategories.length) {
      const list = state.activeTab === "categories" ? state.matchingCategories : state.matchingCategories.slice(0, 3);
      html += list
        .map(
          (category) => `
            <button type="button" class="category-suggestion" data-category-slug="${escapeHtml(category.slug)}">
              <span class="chip-dot" style="background:${escapeHtml(category.display.color)}"></span>
              <span class="category-suggestion-name">${escapeHtml(category.name)}</span>
              ${Icons.chevronRight}
            </button>
          `
        )
        .join("");
    }

    if (showWallpapers) {
      if (showSkeleton && state.items.length === 0) {
        html += `<div class="wallpaper-grid">${WallpaperGrid.renderSkeletons(6)}</div>`;
      } else if (state.items.length === 0 && !state.isLoading) {
        html += `<div class="state-block"><div class="state-title">No wallpapers found</div><div>Try a different search term.</div></div>`;
      } else {
        html += `<div class="wallpaper-grid">${state.items.map((w) => WallpaperGrid.renderCard(w)).join("")}</div>`;
      }
    }

    resultsEl.innerHTML = html;
  }

  function onEnter() {
    if (!state.loadedOnce) {
      state.loadedOnce = true;
      renderShell();
      renderResults();
    }
    setTimeout(() => element.querySelector("#search-input")?.focus(), 50);
  }

  Router.register("search", { onEnter });
})();
