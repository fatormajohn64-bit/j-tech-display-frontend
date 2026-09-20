/**
 * Home tab — the immersive vertical feed (section 13/16 of the product
 * spec). One wallpaper fills the screen at a time; CSS scroll-snap
 * handles the swipe-to-next gesture natively, so there's no gesture
 * library and no JS touch-tracking to get wrong.
 *
 * Layout: a fixed, non-scrolling header (brand + search shortcut +
 * category chips) sits above a separately-scrolling snap feed — matches
 * the reference mockup exactly, and keeps the header always reachable
 * instead of it fighting the feed for scroll events.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="home"]');

  const state = {
    items: [],
    page: 1,
    hasNext: true,
    isLoading: false,
    loadError: null,
    loadedOnce: false,
    hintDismissed: false,
  };

  /** @type {HTMLElement|null} */
  let feedEl = null;

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  // ---------------------------------------------------------------
  // Shell (rendered once) — header + empty feed container
  // ---------------------------------------------------------------
  function renderShell() {
    element.innerHTML = `
      <div class="home-header">
        <div class="brand">
          <span class="brand-jtech">J-Tech</span><span class="brand-display">&nbsp;Display</span>
          ${Icons.crown.replace("<svg", '<svg class="brand-badge"')}
        </div>
        <button type="button" class="search-field" data-action="go-search">
          ${Icons.search}
          <span class="search-field-placeholder">Search wallpapers...</span>
        </button>
        <div class="chip-row" id="home-chip-row"></div>
      </div>
      <div class="home-feed" id="home-feed"></div>
    `;

    feedEl = element.querySelector("#home-feed");

    element.querySelector('[data-action="go-search"]').addEventListener("click", () => {
      Router.navigateTo("search");
    });

    feedEl.addEventListener("scroll", onFeedScroll, { passive: true });
    feedEl.addEventListener("click", onFeedClick);
  }

  // ---------------------------------------------------------------
  // Category chips
  // ---------------------------------------------------------------
  async function loadChips() {
    const chipRow = element.querySelector("#home-chip-row");
    try {
      const { items } = await Api.getCategories();
      chipRow.innerHTML = items
        .slice(0, 12)
        .map(
          (category) => `
            <button type="button" class="chip" data-category-slug="${escapeHtml(category.slug)}">
              <span class="chip-dot" style="background:${escapeHtml(category.display.color)}"></span>
              ${escapeHtml(category.name)}
            </button>
          `
        )
        .join("");

      chipRow.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          Router.navigateTo("category-detail", { slug: chip.dataset.categorySlug });
        });
      });
    } catch (error) {
      // Chips are a nice-to-have shortcut, not core content — fail silently.
      console.error("Failed to load category chips:", error.message);
    }
  }

  // ---------------------------------------------------------------
  // Feed loading
  // ---------------------------------------------------------------
  async function loadPage(isFirstPage) {
    if (state.isLoading || (!isFirstPage && !state.hasNext)) return;
    state.isLoading = true;
    state.loadError = null;

    if (isFirstPage) renderSkeletons();

    try {
      const result = await Api.getFeed({ page: state.page, limit: 10 });
      state.items = isFirstPage ? result.items : [...state.items, ...result.items];
      state.hasNext = result.pagination.has_next;
      state.page += 1;
      renderFeed();
    } catch (error) {
      state.loadError = error.message || "Couldn't load the feed.";
      if (isFirstPage) renderError();
      else Toast.show(state.loadError);
    } finally {
      state.isLoading = false;
    }
  }

  function renderSkeletons() {
    feedEl.innerHTML = Array.from({ length: 2 })
      .map(() => `<div class="feed-card is-skeleton"></div>`)
      .join("");
  }

  function renderError() {
    feedEl.innerHTML = `
      <div class="feed-card feed-card-state">
        <div class="state-block">
          <div class="state-title">Couldn't load the feed</div>
          <div>${escapeHtml(state.loadError)}</div>
          <button type="button" class="state-retry" data-action="retry">Try again</button>
        </div>
      </div>
    `;
    feedEl.querySelector('[data-action="retry"]').addEventListener("click", () => {
      state.page = 1;
      loadPage(true);
    });
  }

  function renderFeed() {
    feedEl.innerHTML = state.items.map((wallpaper, index) => renderCard(wallpaper, index === 0)).join("");
  }

  function renderCard(wallpaper, showHint) {
    const title = wallpaper.title || `${capitalize(wallpaper.source)} Wallpaper`;
    const tags = wallpaper.tags.slice(0, 4);
    const authorLabel = wallpaper.author.name || capitalize(wallpaper.source);

    return `
      <article class="feed-card" data-wallpaper-id="${escapeHtml(wallpaper.id)}">
        <img class="feed-card-img" src="${escapeHtml(wallpaper.image_url)}" alt="${escapeHtml(title)}" loading="lazy" />
        <div class="feed-card-gradient"></div>

        ${showHint && !state.hintDismissed ? `
          <div class="feed-hint" id="feed-hint">
            <span class="feed-hint-chevron">${Icons.chevronDown}</span>
            <div class="feed-hint-title">Swipe Up</div>
            <div class="feed-hint-sub">to discover more wallpapers</div>
          </div>
        ` : ""}

        <div class="feed-actions">
          <button type="button" class="feed-action-btn" data-action="favorite">${Icons.heart}</button>
          <button type="button" class="feed-action-btn" data-action="download">${Icons.download}</button>
          <button type="button" class="feed-action-btn" data-action="share">${Icons.share}</button>
        </div>

        <div class="feed-info">
          <h2 class="feed-title">${escapeHtml(title)}</h2>
          ${tags.length ? `<div class="feed-tags">${tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</div>` : ""}
          <div class="feed-attribution">
            <span class="feed-source-dot"></span>
            <span>${escapeHtml(authorLabel)}</span>
            <button type="button" class="feed-more-btn" data-action="more">${Icons.moreHorizontal}</button>
          </div>
        </div>
      </article>
    `;
  }

  function capitalize(word) {
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
  }

  // ---------------------------------------------------------------
  // Feed interaction
  // ---------------------------------------------------------------
  function onFeedScroll() {
    dismissHint();

    const cardHeight = feedEl.clientHeight;
    if (!cardHeight) return;
    const currentIndex = Math.round(feedEl.scrollTop / cardHeight);

    if (currentIndex >= state.items.length - 3) {
      loadPage(false);
    }
  }

  function dismissHint() {
    if (state.hintDismissed) return;
    state.hintDismissed = true;
    const hint = document.getElementById("feed-hint");
    if (hint) hint.remove();
  }

  function findWallpaper(id) {
    return state.items.find((item) => item.id === id);
  }

  function onFeedClick(event) {
    const card = event.target.closest(".feed-card[data-wallpaper-id]");
    if (!card) return;
    const wallpaper = findWallpaper(card.dataset.wallpaperId);
    if (!wallpaper) return;

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    if (action === "favorite") toggleFavorite(wallpaper, actionButton);
    else if (action === "download") handleDownload(wallpaper);
    else if (action === "share") handleShare(wallpaper);
    else if (action === "more") openDetail(wallpaper);
  }

  function openDetail(wallpaper) {
    Router.navigateTo("wallpaper-detail", { id: wallpaper.id, wallpaper });
  }

  async function toggleFavorite(wallpaper, buttonEl) {
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
      } else {
        await Api.addFavorite(wallpaper);
        Toast.show("Added to favorites");
      }
    } catch (error) {
      buttonEl.classList.toggle("is-favorited", wasFavorited); // rollback
      Toast.show(error.message || "Something went wrong");
    }
  }

  async function handleDownload(wallpaper) {
    Toast.show("Downloading…");
    const succeeded = await MediaActions.downloadWallpaper(wallpaper);
    Toast.show(succeeded ? "Download complete" : "Opened the image — save it from there");
  }

  async function handleShare(wallpaper) {
    const result = await MediaActions.shareWallpaper(wallpaper);
    if (result === "copied") Toast.show("Link copied");
    else if (result === "failed") Toast.show("Couldn't copy the link");
  }

  // ---------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------
  async function onEnter() {
    if (state.loadedOnce) return;
    state.loadedOnce = true;
    renderShell();
    loadChips(); // runs independently, doesn't block the feed
    await loadPage(true);
  }

  Router.register("home", { onEnter });
})();
