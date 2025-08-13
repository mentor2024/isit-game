"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function getHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const qs = new URLSearchParams(hash);
  const out: Record<string, string> = {};
  qs.forEach((v, k) => (out[k] = v));
  return out;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let unsub: undefined | (() => void);

    (async () => {
      try {
        // If we already have a session, go straight to polls
        const { data: s1 } = await supabase.auth.getSession();
        if (s1.session) {
          router.replace("/polls");
          return;
        }

        // Try to hydrate from OAuth implicit hash (#access_token=...)
        const h = getHashParams();
        if (h.access_token && h.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: h.access_token,
            refresh_token: h.refresh_token,
          });
          // Clean the URL (remove the hash) to avoid re-processing
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/auth/callback");
          }
          if (!error) {
            router.replace("/polls");
            return;
          }
          console.error("setSession error:", error);
        }

        // Fallback: wait for auth state event
        const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
          if (session) router.replace("/polls");
        });
        unsub = () => data.subscription.unsubscribe();
      } catch (e) {
        console.error("auth callback error", e);
        router.replace("/");
      }
    })();

    return () => { unsub?.(); };
  }, [router]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      Finishing sign-in…
    </main>
  );
}
