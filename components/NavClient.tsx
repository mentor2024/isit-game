'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NavClient() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-black/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo_isit_game_100x800.png"
            alt="ISIT Game"
            width={800}
            height={100}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/polls" className="hover:underline">Polls</Link>
          <Link href="/polls/new" className="hover:underline">Create</Link>
          <Link href="/dashboard/polls" className="hover:underline">My polls</Link>
        </nav>

        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="text-sm hidden sm:inline">{email}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-2xl border border-black px-3 py-1 text-sm hover:bg-black hover:text-white transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-2xl border border-black px-3 py-1 text-sm hover:bg-black hover:text-white transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
