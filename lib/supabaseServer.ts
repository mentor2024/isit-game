import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Standard user-context Supabase client.
 * Reads the logged-in user's session from their browser cookies.
 * Respects Row Level Security (RLS) — the user can only see/modify
 * data they are permitted to access.
 *
 * Use this for: reading user data, auth checks, anything RLS should govern.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service role Supabase client.
 * Bypasses all Row Level Security (RLS) — has full read/write access.
 * Should only ever be used in server-side code (Server Components,
 * Server Actions, API routes). Never expose this to the browser.
 *
 * Use this for: writing votes, updating scores, admin operations,
 * anything that RLS would otherwise block on the server.
 */
export function getServiceRoleClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        // Service role client doesn't need to read or write cookies —
        // it authenticates via the secret key, not a user session.
        getAll() { return []; },
        setAll() { },
      },
    }
  );
}
