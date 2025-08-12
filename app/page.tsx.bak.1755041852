'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Status = 'checking' | 'signedout' | 'ready';

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');

  const withTimeout = <T,>(p: Promise<T>, ms = 4000) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
      p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });

  async function firstPublishedPollId(): Promise<string|null> {
    // Try published/active first
    try {
      const { data: row } = await supabase
        .from('polls')
        .select('id')
        .in('status', ['published','active'])
        .order('stage', { ascending: true, nullsFirst: true })
        .order('level', { ascending: true, nullsFirst: true })
        .order('rank_pair', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();
      if (row?.id) return row.id;
    } catch {}
    // Fallback: literally any poll
    try {
      const { data: row } = await supabase
        .from('polls')
        .select('id')
        .limit(1)
        .maybeSingle();
      return row?.id ?? null;
    } catch { return null; }
  }

  async function nextPollId(): Promise<string|null> {
    // Prefer server logic if present
    try {
      const { data } = await supabase.rpc('next_poll_for_me');
      if (data && typeof data === 'object' && 'id' in data && (data as any).id) {
        return String((data as any).id);
      }
    } catch {}
    // Fallback to first available
    return await firstPublishedPollId();
  }

  const load = async () => {
    setStatus('checking');
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 4000);
      if (session?.user) {
        const id = await nextPollId();
        if (id) {
          // Hard replace for reliability
          window.location.replace(`/polls/${id}`);
          return;
        }
        // Last resort: go to list
        window.location.replace('/polls');
        return;
      }
      setStatus('signedout');
    } catch {
      setStatus('signedout');
    }
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_IN') load();
      if (ev === 'SIGNED_OUT') setStatus('signedout');
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth:global' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          if (msg?.type === 'SIGNED_IN' || msg?.type === 'SIGNED_OUT') load();
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      sub?.subscription?.unsubscribe?.();
      window.removeEventListener('storage', onStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="text-sm text-black/60">Checking session…</div>
      </div>
    );
  }

  return (
    <main className="min-h-[70vh] grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">IS / IT Game</h1>
        <p className="text-black/70">Welcome. Please sign in to begin.</p>
        <a
          href="/auth"
          className="inline-block rounded-xl bg-black text-white px-4 py-2 outline outline-1 outline-black outline-offset-[2px]"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}
