/**
 * Profile — account summary + navigation into Settings, plus sign-out.
 *
 * Only shows real numbers: a live favorites count (from the backend's
 * `total`). The reference mockup also shows "Collections" and
 * "Followers" stats, but this app has no collections feature and no
 * social/following feature on the backend — rather than show fabricated
 * zeros, those two are simply left out.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="profile"]');
  let loadedOnce = false;

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function renderSignedOut() {
    element.innerHTML = `
      <div class="screen-content">
        <h1 class="screen-title">Profile</h1>
        <div class="state-block">
          <div class="state-title">Sign in to your account</div>
          <div>Sync favorites and preferences across devices.</div>
          <button type="button" class="btn btn-primary" id="profile-sign-in" style="width:auto;padding:0 var(--space-6);margin-top:var(--space-2);">
            Continue with Google
          </button>
        </div>
      </div>
    `;
    element.querySelector("#profile-sign-in").addEventListener("click", () => AppAuth.signInWithGoogle());
  }

  function renderShell(user) {
    const name = user.user_metadata?.full_name || user.user_metadata?.name || "J-Tech User";
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
    const email = user.email || "";

    element.innerHTML = `
      <div class="screen-content">
        <div class="profile-header">
          ${avatarUrl
            ? `<img class="profile-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />`
            : `<div class="profile-avatar profile-avatar-fallback">${Icons.user}</div>`}
          <div class="profile-name">${escapeHtml(name)}</div>
          ${email ? `<div class="profile-email">${escapeHtml(email)}</div>` : ""}
        </div>

        <div class="profile-stats" id="profile-stats">
          <div class="profile-stat"><div class="profile-stat-value">—</div><div class="profile-stat-label">Favorites</div></div>
        </div>

        <div class="profile-menu">
          <button type="button" class="profile-menu-row" data-target="favorites">
            ${Icons.heart} <span>My Favorites</span> ${Icons.chevronRight}
          </button>
          <button type="button" class="profile-menu-row" data-target="settings">
            ${Icons.settings} <span>Settings</span> ${Icons.chevronRight}
          </button>
          <button type="button" class="profile-menu-row" id="profile-help">
            ${Icons.helpCircle} <span>Help &amp; Support</span> ${Icons.chevronRight}
          </button>
          <button type="button" class="profile-menu-row" id="profile-about">
            ${Icons.info} <span>About J-Tech Display</span> ${Icons.chevronRight}
          </button>
        </div>

        <button type="button" class="btn profile-logout" id="profile-logout">Log Out</button>
      </div>
    `;

    element.querySelectorAll("[data-target]").forEach((row) => {
      row.addEventListener("click", () => Router.navigateTo(row.dataset.target));
    });

    element.querySelector("#profile-help").addEventListener("click", () => {
      Toast.show("Support is coming soon — check back shortly.");
    });

    element.querySelector("#profile-about").addEventListener("click", showAboutSheet);

    element.querySelector("#profile-logout").addEventListener("click", async () => {
      await AppAuth.signOut();
      Toast.show("Signed out");
      Router.navigateTo("home");
    });

    loadStats();
  }

  async function loadStats() {
    try {
      const result = await Api.getFavorites({ page: 1, limit: 1 });
      const statsEl = element.querySelector("#profile-stats .profile-stat-value");
      if (statsEl) statsEl.textContent = typeof result.pagination.total === "number" ? result.pagination.total : "—";
    } catch {
      // Non-critical — the row just keeps its "—" placeholder.
    }
  }

  function showAboutSheet() {
    BottomSheet.open(`
      <div class="sheet-handle"></div>
      <div class="about-sheet">
        <div class="brand" style="justify-content:center;margin-bottom:var(--space-2);">
          <span class="brand-jtech">J-Tech</span><span class="brand-display">&nbsp;Display</span>
        </div>
        <div class="about-tagline">Wallpapers. Explore. Be inspired.</div>
        <div class="about-body">
          J-Tech Display aggregates wallpapers from Pexels, Pixabay, Unsplash, and Wallhaven into one
          fast, immersive feed. Every image links back to its original source and creator.
        </div>
      </div>
    `);
  }

  function onEnter() {
    const user = AppAuth.getCurrentUser();
    if (!user) {
      renderSignedOut();
    } else {
      renderShell(user);
    }
  }

  AppAuth.onChange(() => {
    if (loadedOnce && Router.current() === "profile") onEnter();
    loadedOnce = true;
  });

  Router.register("profile", { onEnter });
})();
