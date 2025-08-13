import { createClient } from "@supabase/supabase-js";

// These MUST be set in Vercel (Production) and your .env.local (dev)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Disable detectSessionInUrl because we handle the hash manually in /auth/callback
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
