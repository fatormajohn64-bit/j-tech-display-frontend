/**
 * Every call to the J-Tech Display backend goes through here. Handles:
 *  - building the URL from API_BASE_URL + path + query params
 *  - attaching `Authorization: Bearer <token>` automatically when
 *    signed in (silently omitted when signed out — public endpoints
 *    like search/feed/categories don't need it)
 *  - unwrapping the backend's `{ success, data, error }` envelope
 *  - throwing a single ApiError type on any failure, so every screen
 *    handles errors the same way instead of each reinventing it
 */

class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status || 0;
    this.code = code || "UNKNOWN_ERROR";
  }
}

const Api = (() => {
  const BASE_URL = window.APP_CONFIG.API_BASE_URL;

  /**
   * @param {string} path - e.g. "/api/search"
   * @param {Record<string, any>} [params] - Query params; undefined/null/"" values are omitted.
   * @returns {string}
   */
  function buildUrl(path, params = {}) {
    const url = new URL(path, BASE_URL);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  /**
   * @param {string} path
   * @param {Object} [options]
   * @param {"GET"|"POST"|"PUT"|"DELETE"} [options.method="GET"]
   * @param {Record<string, any>} [options.params] - Query params (GET-style filters).
   * @param {any} [options.body] - JSON-serialized as the request body.
   * @param {boolean} [options.auth=false] - Attach the signed-in user's token. Fails loudly if not signed in.
   * @returns {Promise<any>} The unwrapped `data` field on success.
   * @throws {ApiError}
   */
  async function request(path, options = {}) {
    const { method = "GET", params, body, auth = false } = options;

    const headers = { "Content-Type": "application/json" };

    if (auth) {
      const token = await AppAuth.getAccessToken();
      if (!token) {
        throw new ApiError("Sign in required.", { status: 401, code: "UNAUTHORIZED" });
      }
      headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(buildUrl(path, params), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      throw new ApiError("Couldn't reach the server. Check your connection and try again.", {
        status: 0,
        code: "NETWORK_ERROR",
      });
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError("The server sent an unexpected response.", {
        status: response.status,
        code: "PARSE_ERROR",
      });
    }

    if (!response.ok || payload.success === false) {
      throw new ApiError(payload.error?.message || "Something went wrong.", {
        status: response.status,
        code: payload.error?.code,
      });
    }

    return payload.data;
  }

  // ---- Wallpapers ----
  const search = (query, params) => request("/api/search", { params: { q: query, ...params } });
  const getFeed = (params) => request("/api/wallpapers/feed", { params });
  const getWallpaperById = (id) => request(`/api/wallpapers/${encodeURIComponent(id)}`);

  // ---- Categories ----
  const getCategories = () => request("/api/categories");
  const getCategoryWallpapers = (slug, params) =>
    request(`/api/categories/${encodeURIComponent(slug)}`, { params });

  // ---- Settings (auth) ----
  const getSettings = () => request("/api/settings", { auth: true });
  const updateSettings = (updates) => request("/api/settings", { method: "PUT", body: updates, auth: true });

  // ---- Favorites (auth) ----
  const getFavorites = (params) => request("/api/favorites", { params, auth: true });
  const addFavorite = (wallpaper) => request("/api/favorites", { method: "POST", body: wallpaper, auth: true });
  const removeFavorite = (wallpaperId) =>
    request(`/api/favorites/${encodeURIComponent(wallpaperId)}`, { method: "DELETE", auth: true });

  // ---- Users (auth) ----
  const getMe = () => request("/api/users/me", { auth: true });
  const updateMe = (updates) => request("/api/users/me", { method: "PUT", body: updates, auth: true });

  return {
    search,
    getFeed,
    getWallpaperById,
    getCategories,
    getCategoryWallpapers,
    getSettings,
    updateSettings,
    getFavorites,
    addFavorite,
    removeFavorite,
    getMe,
    updateMe,
  };
})();
