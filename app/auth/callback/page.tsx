"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function readHash() {
  if (typeof window === "undefined") return {};
  const qs = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    access_token: qs.get("access_token") ?? undefined,
    refresh_token: qs.get("refresh_token") ?? undefined,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    let unsub: undefined | (() => void);

    (async () => {
      try {
        // LAZY import so the server never tries to load supabase-js here
        const { supabase } = await import("@/lib/supabase");

        // already signed in? go to polls
        const { data: s0 } = await supabase.auth.getSession();
        if (s0.session) {
          router.replace("/polls");
          return;
        }

        // handle implicit grant (hash) tokens
        const { access_token, refresh_token } = readHash();
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          // clean the URL to avoid re-processing
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/auth/callback");
          }
          if (error) {
            console.error("setSession error:", error);
            setMsg("Sign-in finished, but storing the session failed. Please try again.");
            return;
          }
          router.replace("/polls");
          return;
        }

        // fallback: wait for auth event
        const { data } = supabase.auth.onAuthStateChange((_e, session) => {
          if (session) router.replace("/polls");
        });
        unsub = () => data.subscription.unsubscribe();
      } catch (e) {
        console.error("auth callback error", e);
        setMsg("Sign-in failed. Return to /auth and try again.");
      }
    })();

    return () => { unsub?.(); };
  }, [router]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      {msg}
    </main>
  );
}
