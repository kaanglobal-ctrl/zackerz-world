import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// Server-side only. The anon key never reaches the browser — the frontend
// talks to Express API routes, which use this client. Authorization is
// enforced in Express, not via Supabase RLS.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Lazily create the client so a failure during createClient (e.g. realtime
// init) doesn't crash the module at import time — it surfaces as a thrown
// error on first use, which Express can handle and report.
let _client: SupabaseClient | null = null;
let _error: unknown = null;

function create() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY"
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as never },
  });
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (_error) throw _error;
    if (!_client) {
      try {
        _client = create();
      } catch (e) {
        _error = e;
        throw e;
      }
    }
    const val = (_client as any)[prop];
    return typeof val === "function" ? val.bind(_client) : val;
  },
});
