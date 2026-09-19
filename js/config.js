/**
 * Single source of truth for every URL/key the frontend needs. Nothing
 * else in the app reads these values from anywhere but this file, so
 * pointing the app at a different backend or Supabase project later is
 * a one-file change.
 *
 * These are all PUBLIC, client-safe values — Supabase's anon key is
 * designed to be exposed in frontend code (Row Level Security is what
 * actually protects data, not hiding this key). Nothing secret belongs
 * here; the service-role key and provider API keys live only in the
 * backend's own environment variables and are never sent to the client.
 */
window.APP_CONFIG = {
  // Your deployed J-Tech Display backend (Phase 1–7). Point this at
  // http://localhost:3000 while developing against a local backend.
  API_BASE_URL: "https://your-backend.onrender.com",

  // From Supabase Dashboard → Project Settings → API.
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
