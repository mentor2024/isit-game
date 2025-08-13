"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let unsub: (() => void) | undefined;

    // 1) If we already have a session, go now
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/polls");
    });

    // 2) Otherwise wait for the auth state event, then go
    const { data } = supabase.auth.onAuthStateChange((_evt, _session) => {
      router.replace("/polls");
    });
    unsub = () => data.subscription.unsubscribe();

    return () => { unsub?.(); };
  }, [router]);

  return <main style={{padding:24,fontFamily:"system-ui,sans-serif"}}>Signed in. Redirecting…</main>;
}
