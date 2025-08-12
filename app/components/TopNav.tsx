'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = { full_name: string | null; avatar_url: string | null };

type NavItem = { href: string; label: string; requires?: string[] };

const ALL_LINKS: NavItem[] = [
  { href: '/',            label: 'Home' },
  { href: '/objects',     label: 'Objects',     requires: ['admin.all','objects.manage'] },
  { href: '/polls',       label: 'Polls',       requires: ['admin.all','polls.manage'] },
  { href: '/engagements', label: 'Engagements', requires: ['admin.all','engagements.manage'] },
  { href: '/powers',      label: 'Powers',      requires: ['admin.all','powers.manage'] },
  { href: '/scores',      label: 'Scores',      requires: ['admin.all','scores.manage'] },
  { href: '/users',       label: 'Users',       requires: ['admin.all','users.manage'] },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [powerSet, setPowerSet] = useState<Set<string>>(new Set());

  async function refreshAuthUI() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    setUserEmail(user?.email ?? null);

    if (user?.id) {
      try { await supabase.rpc('ensure_my_profile'); } catch {}
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      setProfile((p as any) ?? null);

      let codes: string[] = [];
      try {
        const { data } = await supabase
          .from('user_powers')
          .select('power')
          .eq('user_id', user.id);
        codes = (data ?? []).map((r:any)=>r.power);
      } catch {
        try {
          const { data } = await supabase.rpc('list_my_powers');
          codes = Array.isArray(data) ? data : [];
        } catch {}
      }
      setPowerSet(new Set(codes));
    } else {
      setProfile(null);
      setPowerSet(new Set());
    }
  }

  useEffect(() => {
    refreshAuthUI();

    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') refreshAuthUI();
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth:global' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          if (msg?.type === 'SIGNED_IN' || msg?.type === 'SIGNED_OUT') refreshAuthUI();
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      sub?.subscription?.unsubscribe?.();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const links = useMemo(() => {
    return ALL_LINKS.filter(item => {
      if (!item.requires?.length) return true;
      const has = (code: string) =>
        powerSet.has(code) || [...powerSet].some(c => c.startsWith(code + '.'));
      return item.requires.some(has);
    });
  }, [powerSet]);

  const signOut = async () => {
    await supabase.auth.signOut();
    try {
      const ch = new BroadcastChannel('auth-global');
      ch.postMessage({ type: 'SIGNED_OUT', t: Date.now() });
      ch.close();
    } catch {}
    try {
      localStorage.setItem('auth:global', JSON.stringify({ type: 'SIGNED_OUT', t: Date.now() }));
    } catch {}
    // Hard reload ensures header reflects logged-out state immediately
    window.location.replace('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-black/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          <Link href="/" className="font-semibold tracking-tight">ISIT Game</Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map(link => {
              const active =
                pathname === link.href ||
                (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'px-3 py-1.5 rounded-xl text-sm transition whitespace-nowrap',
                    active ? 'bg-black text-white' : 'text-black hover:bg-black/5'
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {userEmail ? (
              <>
                <Link href="/profile" className="flex items-center gap-2 group">
                  <img
                    src={profile?.avatar_url || '/images/logo_isit_game_100x800.png'}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover border border-black/10"
                  />
                  <span className="text-sm">
                    {profile?.full_name || userEmail}
                  </span>
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm rounded-xl border border-black/10 px-3 py-1.5 hover:bg-black/5"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="text-sm rounded-xl bg-black text-white px-3 py-1.5 outline outline-1 outline-black outline-offset-[2px]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
