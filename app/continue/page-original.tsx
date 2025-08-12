'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";

export default function ContinuePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        router.replace('/auth');
        return;
      }
      const { data } = await supabase.rpc('next_poll_for_user');
      const next = Array.isArray(data) ? data[0] : data;
      if (next?.next_poll_id) {
        router.replace(`/polls/${next.next_poll_id}`);
      } else {
        router.replace('/polls'); // fallback
      }
    })();
  }, [router]);

  return <main className="min-h-[60vh] grid place-items-center">Loading your next poll…</main>;
}
