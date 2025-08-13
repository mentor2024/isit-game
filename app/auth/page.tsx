"use client";

import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const signin = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` }
    });
  };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Sign in</h1>
      <button onClick={() => signin("google")} style={{marginRight:12}}>Continue with Google</button>
      <button onClick={() => signin("github")}>Continue with GitHub</button>
    </main>
  );
}
