'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState('Completing sign-in…');

  useEffect(() => {
    (async () => {
      try {
        // Flow A: PKCE (OAuth) → ?code=...
        const code = sp.get('code');
        if (code) {
          setMsg('Exchanging code for session…');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!data?.session) throw new Error('No session from exchange.');
          await notifyAndGo();
          return;
        }

        // Flow B: Hash tokens → #access_token=...
        if (location.hash.includes('access_token=')) {
          setMsg('Setting session from hash…');
          const q = new URLSearchParams(location.hash.replace(/^#/, ''));
          const access_token = q.get('access_token');
          const refresh_token = q.get('refresh_token') || '';
          if (!access_token) throw new Error('No access_token in hash.');
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          if (!data?.session) throw new Error('No session from hash.');
          await notifyAndGo();
          return;
        }

        setMsg('Auth error: Missing ?code or #access_token in URL.');
      } catch (e: any) {
        setMsg(`Auth error: ${e?.message || e}`);
      }
    })();

    async function notifyAndGo() {
      try { const ch = new BroadcastChannel('auth-global'); ch.postMessage({ type: 'SIGNED_IN' }); ch.close(); } catch {}
      try { localStorage.setItem('auth:global', JSON.stringify({ type: 'SIGNED_IN', t: Date.now() })); } catch {}
      setMsg('Signed in. Redirecting…');
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold">Auth Callback</h1>
        <p className="text-sm text-black/70">{msg}</p>
        <a href="/" className="inline-block rounded-xl bg-black text-white px-4 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">
          Continue
        </a>
      </div>
    </main>
  );
}
