/**
 * Wallpaper Detail — pushed on top of whatever tab the user tapped a
 * wallpaper from. Accepts `{ id, wallpaper }` params: if the caller
 * already has the full object (every grid/feed screen does, since
 * search/feed/category results already return full wallpaper objects)
 * it renders instantly with no extra fetch; otherwise it fetches by id.
 *
 * No "Set as Wallpaper" button here — that's not a cut corner, it's a
 * real web-platform limit: no browser API lets a page set a phone's
 * system wallpaper. Download is the real, working primary action.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="wallpaper-detail"]');

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function capitalize(word) {
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
  }

  function qualityLabel(width, height) {
    if (!width || !height) return null;
    const minSide = Math.min(width, height);
    if (minSide >= 2160) return "4K";
    if (minSide >= 1080) return "HD";
    return null;
  }

  function renderLoading() {
    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="detail-topbar">
          <button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button>
        </div>
        <div class="detail-image is-skeleton"></div>
        <div class="state-block"><div class="spinner"></div></div>
      </div>
    `;
  }

  function renderError(message) {
    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="detail-topbar">
          <button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button>
        </div>
        <div class="state-block">
          <div class="state-title">Couldn't load this wallpaper</div>
          <div>${escapeHtml(message)}</div>
        </div>
      </div>
    `;
  }

  function render(wallpaper) {
    const title = wallpaper.title || `${capitalize(wallpaper.source)} Wallpaper`;
    const tags = wallpaper.tags.slice(0, 6);
    const authorLabel = wallpaper.author.name || capitalize(wallpaper.source);
    const quality = qualityLabel(wallpaper.width, wallpaper.height);

    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="detail-topbar">
          <button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button>
          <div class="detail-topbar-spacer"></div>
          <button type="button" class="icon-btn" id="detail-favorite">${Icons.heart}</button>
          <button type="button" class="icon-btn" id="detail-more">${Icons.moreHorizontal}</button>
        </div>

        <img class="detail-image" src="${escapeHtml(wallpaper.image_url)}" alt="${escapeHtml(title)}" />

        <h1 class="detail-title">${escapeHtml(title)}</h1>
        ${tags.length ? `<div class="detail-tags">${tags.map((t) => `#${escapeHtml(t)}`).join(" ")}</div>` : ""}

        <div class="detail-attribution">
          <span class="feed-source-dot"></span>
          <span>${escapeHtml(authorLabel)}</span>
          ${wallpaper.source_url ? `<a href="${escapeHtml(wallpaper.source_url)}" target="_blank" rel="noopener" class="detail-source-link">View source</a>` : ""}
        </div>

        <div class="detail-meta-row">
          ${wallpaper.width && wallpaper.height ? `<span class="detail-badge">${wallpaper.width} × ${wallpaper.height}</span>` : ""}
          ${wallpaper.orientation !== "unknown" ? `<span class="detail-badge">${capitalize(wallpaper.orientation)}</span>` : ""}
          ${quality ? `<span class="detail-badge">${quality}</span>` : ""}
        </div>

        <button type="button" class="btn btn-primary" id="detail-download">
          ${Icons.download}
          Download
        </button>
      </div>
    `;

    element.querySelector("#detail-favorite").addEventListener("click", (e) => toggleFavorite(wallpaper, e.currentTarget));
    element.querySelector("#detail-more").addEventListener("click", () => openShareSheet(wallpaper));
    element.querySelector("#detail-download").addEventListener("click", () => handleDownload(wallpaper));
  }

  function openShareSheet(wallpaper) {
    BottomSheet.open(
      `
        <div class="sheet-handle"></div>
        <div class="sheet-title">Download &amp; Share</div>
        <div class="sheet-grid">
          <button type="button" class="sheet-grid-item" data-sheet-action="download">
            <span class="icon-btn">${Icons.download}</span> Download
          </button>
          <button type="button" class="sheet-grid-item" data-sheet-action="share">
            <span class="icon-btn">${Icons.share}</span> Share
          </button>
          <button type="button" class="sheet-grid-item" data-sheet-action="copy">
            <span class="icon-btn">${Icons.copyLink}</span> Copy Link
          </button>
          <button type="button" class="sheet-grid-item" data-sheet-action="more">
            <span class="icon-btn">${Icons.moreHorizontal}</span> More
          </button>
        </div>
        ${wallpaper.source_url ? `
          <a href="${escapeHtml(wallpaper.source_url)}" target="_blank" rel="noopener" class="sheet-row">
            ${Icons.externalLink} View source on ${capitalize(wallpaper.source)}
          </a>
        ` : ""}
      `,
      (panel) => {
        panel.querySelector('[data-sheet-action="download"]').addEventListener("click", () => {
          BottomSheet.close();
          handleDownload(wallpaper);
        });
        panel.querySelector('[data-sheet-action="share"]').addEventListener("click", () => {
          BottomSheet.close();
          handleShare(wallpaper);
        });
        panel.querySelector('[data-sheet-action="copy"]').addEventListener("click", async () => {
          BottomSheet.close();
          const result = await MediaActions.copyLink(wallpaper.source_url || wallpaper.image_url);
          Toast.show(result === "copied" ? "Link copied" : "Couldn't copy the link");
        });
        panel.querySelector('[data-sheet-action="more"]').addEventListener("click", () => {
          BottomSheet.close();
          handleShare(wallpaper);
        });
      }
    );
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
      buttonEl.classList.toggle("is-favorited", wasFavorited);
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

  async function onEnter(params = {}) {
    if (params.wallpaper) {
      render(params.wallpaper);
      return;
    }
    if (!params.id) {
      renderError("No wallpaper specified.");
      return;
    }
    renderLoading();
    try {
      const wallpaper = await Api.getWallpaperById(params.id);
      if (!wallpaper) renderError("This wallpaper couldn't be found.");
      else render(wallpaper);
    } catch (error) {
      renderError(error.message || "Something went wrong.");
    }
  }

  Router.register("wallpaper-detail", { onEnter });
})();
