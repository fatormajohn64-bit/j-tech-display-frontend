/**
 * Thin wrapper around Supabase Auth. This is the entire "account
 * system" on the frontend — there is no custom login form, no
 * password field, no verification code screen anywhere in this app.
 * Signing in is one tap → Google's own consent screen → back into the
 * app, already signed in.
 *
 * Requires window.APP_CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY (see
 * config.js) and the Supabase JS library loaded before this file (see
 * the <script> tag in index.html).
 */

const AppAuth = (() => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

  const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  const client = isConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /** @type {((user: object|null) => void)[]} */
  const listeners = [];

  let currentUser = null;

  function notify() {
    listeners.forEach((fn) => fn(currentUser));
  }

  if (client) {
    client.auth.getSession().then(({ data }) => {
      currentUser = data.session?.user || null;
      notify();
    });

    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      notify();
    });
  }

  /**
   * Starts the Google sign-in flow. Supabase redirects to Google's
   * consent screen and back — nothing else on this page needs to do
   * anything else; onAuthStateChange above picks up the resulting
   * session automatically.
   */
  async function signInWithGoogle() {
    if (!client) {
      console.error("Supabase is not configured — set SUPABASE_URL/SUPABASE_ANON_KEY in js/config.js");
      return;
    }
    await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  /**
   * @returns {Promise<string|null>} The current session's access token,
   *   or null if signed out — api.js sends this as the Authorization
   *   header on every request to a 🔒 backend route.
   */
  async function getAccessToken() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session?.access_token || null;
  }

  /**
   * @param {(user: object|null) => void} fn - Called immediately with
   *   the current user (or null), then again on every sign-in/sign-out.
   */
  function onChange(fn) {
    listeners.push(fn);
    fn(currentUser);
  }

  function getCurrentUser() {
    return currentUser;
  }

  return { isConfigured, signInWithGoogle, signOut, getAccessToken, onChange, getCurrentUser };
})();
