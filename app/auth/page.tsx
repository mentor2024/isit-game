'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  // If already signed in, head to Home (which will route to next poll)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace('/');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.replace('/');
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [router]);

  const signInOAuth = async (provider: 'google'|'facebook'|'github'|'apple') => {
    setErr(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${location.origin}/auth/callback` }
      });
      if (error) setErr(error.message);
      // For OAuth, you’ll be redirected; no further code here.
    } catch (e:any) {
      setErr(e?.message || 'OAuth error');
      setBusy(false);
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw
      });
      if (error) throw error;
      router.replace('/'); // Home → next poll
    } catch (e:any) {
      setErr(e?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: { emailRedirectTo: `${location.origin}/auth/callback` }
      });
      if (error) throw error;
      // Depending on your project settings, user might need to confirm via email.
      router.replace('/'); // Home will route if session is active
    } catch (e:any) {
      setErr(e?.message || 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center">
      <div className="mx-auto max-w-lg w-full p-6">
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

        <div className="grid grid-cols-1 gap-3 mb-6">
          <button
            onClick={() => signInOAuth('google')}
            disabled={busy}
            className="w-full rounded-xl border border-black/15 px-3 py-2 hover:bg-black/5 disabled:opacity-60"
          >
            Continue with Google
          </button>
          <button
            onClick={() => signInOAuth('facebook')}
            disabled={busy}
            className="w-full rounded-xl border border-black/15 px-3 py-2 hover:bg-black/5 disabled:opacity-60"
          >
            Continue with Facebook
          </button>
          {/* Add more providers if you enable them:
          <button onClick={() => signInOAuth('github')} ...>Continue with GitHub</button>
          <button onClick={() => signInOAuth('apple')}  ...>Continue with Apple</button>
          */}
        </div>

        <div className="text-center text-xs text-black/50 my-4">— or —</div>

        <form onSubmit={signInWithPassword} className="space-y-3 mb-4">
          <input
            type="email"
            required
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-black/15 rounded-xl px-3 py-2"
          />
          <input
            type="password"
            required
            value={pw}
            onChange={e=>setPw(e.target.value)}
            placeholder="Password"
            className="w-full border border-black/15 rounded-xl px-3 py-2"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-black text-white px-3 py-2 outline outline-1 outline-black outline-offset-[2px] disabled:opacity-60"
          >
            Sign in with Email
          </button>
        </form>

        <form onSubmit={signUp} className="space-y-3">
          <div className="text-sm font-medium">New here?</div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl border border-black/15 px-3 py-2 hover:bg-black/5 disabled:opacity-60"
          >
            Create account
          </button>
        </form>

        {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}
      </div>
    </main>
  );
}
