/**
 * Settings — every field here maps 1:1 to a real column in the backend's
 * user_settings table (see database/schema.sql / routes/settings.js).
 * No "Language" row: the reference mockup has one, but there's no
 * backend field for it, so rather than a toggle that silently does
 * nothing, it's left out until that's a real, working setting.
 */
(() => {
  const element = document.querySelector('.screen[data-screen="settings"]');

  const THEME_OPTIONS = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "System" },
  ];
  const QUALITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "original", label: "Original" },
  ];
  const ORIENTATION_OPTIONS = [
    { value: "portrait", label: "Portrait" },
    { value: "landscape", label: "Landscape" },
    { value: "square", label: "Square" },
  ];

  let settings = null;
  let categories = [];

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function labelFor(options, value) {
    return options.find((o) => o.value === value)?.label || value;
  }

  function renderSignedOut() {
    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="detail-topbar"><button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button></div>
        <div class="state-block">
          <div class="state-title">Sign in required</div>
          <div>Settings sync to your account, so you'll need to sign in first.</div>
        </div>
      </div>
    `;
  }

  function renderLoading() {
    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="detail-topbar"><button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button></div>
        <div class="state-block"><div class="spinner"></div></div>
      </div>
    `;
  }

  function categoryNames(slugs) {
    if (!slugs || slugs.length === 0) return "None";
    return slugs
      .map((slug) => categories.find((c) => c.slug === slug)?.name || slug)
      .join(", ");
  }

  function render() {
    element.innerHTML = `
      <div class="screen-content no-bottom-nav">
        <div class="detail-topbar">
          <button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button>
        </div>
        <h1 class="screen-title">Settings</h1>

        <div class="settings-group-label">App Preferences</div>
        <div class="settings-group">
          <button type="button" class="settings-row" data-choice="theme">
            ${Icons.moon} <span>Theme</span> <span class="settings-row-value">${labelFor(THEME_OPTIONS, settings.theme)}</span> ${Icons.chevronRight}
          </button>
          <button type="button" class="settings-row" data-choice="wallpaper_quality">
            ${Icons.layers} <span>Wallpaper Quality</span> <span class="settings-row-value">${labelFor(QUALITY_OPTIONS, settings.wallpaper_quality)}</span> ${Icons.chevronRight}
          </button>
          <button type="button" class="settings-row" data-choice="preferred_orientation">
            ${Icons.smartphone} <span>Preferred Orientation</span> <span class="settings-row-value">${labelFor(ORIENTATION_OPTIONS, settings.preferred_orientation)}</span> ${Icons.chevronRight}
          </button>
          <div class="settings-row">
            ${Icons.play} <span>Auto-play Feed</span>
            <button type="button" class="switch${settings.autoplay_feed ? " is-on" : ""}" data-toggle="autoplay_feed"><span class="switch-knob"></span></button>
          </div>
          <div class="settings-row">
            ${Icons.wifiOff} <span>Data Saver</span>
            <button type="button" class="switch${settings.data_saver ? " is-on" : ""}" data-toggle="data_saver"><span class="switch-knob"></span></button>
          </div>
        </div>

        <div class="settings-group-label">Content Preferences</div>
        <div class="settings-group">
          <button type="button" class="settings-row settings-row-stacked" data-multi="preferred_categories">
            ${Icons.tag}
            <span class="settings-row-stacked-text">
              <span>Preferred Categories</span>
              <span class="settings-row-sub">${escapeHtml(categoryNames(settings.preferred_categories))}</span>
            </span>
            ${Icons.chevronRight}
          </button>
          <button type="button" class="settings-row settings-row-stacked" data-multi="hide_categories">
            ${Icons.eyeOff}
            <span class="settings-row-stacked-text">
              <span>Hide Categories</span>
              <span class="settings-row-sub">${escapeHtml(categoryNames(settings.hide_categories))}</span>
            </span>
            ${Icons.chevronRight}
          </button>
        </div>

        <div class="settings-group-label">Other</div>
        <div class="settings-group">
          <div class="settings-row">
            ${Icons.download} <span>Show Download Button</span>
            <button type="button" class="switch${settings.show_download_button ? " is-on" : ""}" data-toggle="show_download_button"><span class="switch-knob"></span></button>
          </div>
          <div class="settings-row">
            ${Icons.info} <span>Show Source Info</span>
            <button type="button" class="switch${settings.show_source ? " is-on" : ""}" data-toggle="show_source"><span class="switch-knob"></span></button>
          </div>
        </div>
      </div>
    `;

    element.querySelectorAll("[data-choice]").forEach((row) => {
      row.addEventListener("click", () => openChoiceSheet(row.dataset.choice));
    });
    element.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => handleToggle(btn.dataset.toggle, btn));
    });
    element.querySelectorAll("[data-multi]").forEach((row) => {
      row.addEventListener("click", () => openMultiSelectSheet(row.dataset.multi));
    });
  }

  const CHOICE_CONFIG = {
    theme: { title: "Theme", options: THEME_OPTIONS },
    wallpaper_quality: { title: "Wallpaper Quality", options: QUALITY_OPTIONS },
    preferred_orientation: { title: "Preferred Orientation", options: ORIENTATION_OPTIONS },
  };

  function openChoiceSheet(key) {
    const { title, options } = CHOICE_CONFIG[key];
    BottomSheet.open(
      `
        <div class="sheet-handle"></div>
        <div class="sheet-title">${escapeHtml(title)}</div>
        ${options
          .map(
            (opt) => `
              <button type="button" class="sheet-row settings-choice-option" data-value="${escapeHtml(opt.value)}" style="border-top:none;justify-content:space-between;">
                <span>${escapeHtml(opt.label)}</span>
                ${settings[key] === opt.value ? Icons.check : ""}
              </button>
            `
          )
          .join("")}
      `,
      (panel) => {
        panel.querySelectorAll(".settings-choice-option").forEach((btn) => {
          btn.addEventListener("click", async () => {
            BottomSheet.close();
            await saveSettings({ [key]: btn.dataset.value });
          });
        });
      }
    );
  }

  async function handleToggle(key, buttonEl) {
    const next = !buttonEl.classList.contains("is-on");
    buttonEl.classList.toggle("is-on", next);
    await saveSettings({ [key]: next }, () => buttonEl.classList.toggle("is-on", !next));
  }

  function openMultiSelectSheet(key) {
    const selected = new Set(settings[key] || []);
    BottomSheet.open(
      `
        <div class="sheet-handle"></div>
        <div class="sheet-title">${key === "preferred_categories" ? "Preferred Categories" : "Hide Categories"}</div>
        <div class="settings-multi-list">
          ${categories
            .map(
              (c) => `
                <label class="settings-multi-option">
                  <input type="checkbox" value="${escapeHtml(c.slug)}" ${selected.has(c.slug) ? "checked" : ""} />
                  <span class="chip-dot" style="background:${escapeHtml(c.display.color)}"></span>
                  <span>${escapeHtml(c.name)}</span>
                </label>
              `
            )
            .join("")}
        </div>
        <button type="button" class="btn btn-primary" id="multi-select-done" style="margin-top:var(--space-3);">Done</button>
      `,
      (panel) => {
        panel.querySelector("#multi-select-done").addEventListener("click", async () => {
          const checked = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
          BottomSheet.close();
          await saveSettings({ [key]: checked });
        });
      }
    );
  }

  async function saveSettings(updates, onFailureRollback) {
    const previous = { ...settings };
    settings = { ...settings, ...updates };
    try {
      const updated = await Api.updateSettings(updates);
      settings = updated;
      render();
    } catch (error) {
      settings = previous;
      if (onFailureRollback) onFailureRollback();
      Toast.show(error.message || "Couldn't save that setting");
      render();
    }
  }

  async function onEnter() {
    if (!AppAuth.getCurrentUser()) {
      renderSignedOut();
      return;
    }
    renderLoading();
    try {
      const [settingsResult, categoriesResult] = await Promise.all([Api.getSettings(), Api.getCategories()]);
      settings = settingsResult;
      categories = categoriesResult.items;
      render();
    } catch (error) {
      element.innerHTML = `
        <div class="screen-content no-bottom-nav">
          <div class="detail-topbar"><button type="button" class="icon-btn" data-action="back">${Icons.chevronLeft}</button></div>
          <div class="state-block">
            <div class="state-title">Couldn't load settings</div>
            <div>${escapeHtml(error.message)}</div>
          </div>
        </div>
      `;
    }
  }

  Router.register("settings", { onEnter });
})();
