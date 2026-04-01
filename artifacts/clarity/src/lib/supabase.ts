// Device identity — a stable UUID stored in localStorage, used to request a
// real Supabase user ID from the API server on first load.
const DEVICE_ID_KEY = 'clarity_device_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return generateUUID();
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Cloud sync is always available via the API server.
// The server holds the Supabase service_role key — no browser-side Supabase
// client or key is needed.
export const isSupabaseConfigured = true;

// Kept for legacy import compatibility. No direct browser ↔ Supabase DB calls.
export const supabase = null;
export function getSupabaseClient() { return null; }
