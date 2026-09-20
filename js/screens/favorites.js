/**
 * Favorites — requires Google sign-in. Each row from GET /api/favorites
 * wraps a full wallpaper snapshot in `wallpaper_data` (stored at
 * favorite-time so it survives the provider later changing/removing the
 * original), which is unwrapped here into a plain wallpaper object
 * before handing it to WallpaperGrid.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="favorites"]');

  const state = {
    items: [],
    page: 1,
    hasNext: false,
    isLoading: false,
    total: null,
  };

  let signedIn = false;

  function renderSignedOut() {
    element.innerHTML = `
      <div class="screen-content">
        <h1 class="screen-title">Favorites</h1>
        <div class="state-block">
          <div class="state-title">Sign in to see your favorites</div>
          <div>Your saved wallpapers sync across every device you sign into.</div>
          <button type="button" class="btn btn-primary" id="favorites-sign-in" style="width:auto;padding:0 var(--space-6);margin-top:var(--space-2);">
            Continue with Google
          </button>
        </div>
      </div>
    `;
    element.querySelector("#favorites-sign-in").addEventListener("click", () => AppAuth.signInWithGoogle());
  }

  function renderShell() {
    element.innerHTML = `
      <div class="screen-content">
        <h1 class="screen-title">Favorites${state.total !== null ? ` <span class="screen-title-count">(${state.total})</span>` : ""}</h1>
        <div class="wallpaper-grid" id="favorites-grid">${WallpaperGrid.renderSkeletons(6)}</div>
      </div>
    `;

    const grid = element.querySelector("#favorites-grid");
    WallpaperGrid.attach(grid, {
      findWallpaper: (id) => state.items.find((item) => item.id === id),
      onRemoved: (wallpaper) => {
        state.items = state.items.filter((item) => item.id !== wallpaper.id);
        if (state.total !== null) state.total -= 1;
        renderGrid();
      },
    });
    element.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 600;
    if (nearBottom && !state.isLoading && state.hasNext) loadPage();
  }

  async function loadPage() {
    state.isLoading = true;
    try {
      const result = await Api.getFavorites({ page: state.page, limit: 20 });
      const wallpapers = result.items.map((row) => row.wallpaper_data);
      state.items = state.page === 1 ? wallpapers : [...state.items, ...wallpapers];
      state.hasNext = result.pagination.has_next;
      if (typeof result.pagination.total === "number") state.total = result.pagination.total;
      state.page += 1;
      renderGrid();
    } catch (error) {
      Toast.show(error.message || "Couldn't load your favorites");
    } finally {
      state.isLoading = false;
    }
  }

  function renderGrid() {
    const grid = element.querySelector("#favorites-grid");
    if (!grid) return;
    if (state.items.length === 0) {
      element.querySelector(".screen-content").innerHTML = `
        <h1 class="screen-title">Favorites</h1>
        <div class="state-block">
          <div class="state-title">No favorites yet</div>
          <div>Tap the heart on any wallpaper to save it here.</div>
        </div>
      `;
      return;
    }
    grid.innerHTML = state.items.map((w) => WallpaperGrid.renderCard(w, { favorited: true })).join("");
  }

  async function onEnter() {
    signedIn = Boolean(AppAuth.getCurrentUser());
    if (!signedIn) {
      renderSignedOut();
      return;
    }
    state.page = 1;
    state.items = [];
    state.total = null;
    renderShell();
    await loadPage();
  }

  AppAuth.onChange((user) => {
    // If the user signs out while sitting on this tab, flip to the
    // signed-out state immediately rather than leaving a stale grid up.
    if (!user && signedIn && Router.current() === "favorites") {
      signedIn = false;
      renderSignedOut();
    }
  });

  Router.register("favorites", { onEnter });
})();
