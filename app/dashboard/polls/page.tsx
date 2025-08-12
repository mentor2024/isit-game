'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";

type Poll = { id: string; title: string; status: string; updated_at: string | null };

export default function MyPollsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from('polls')
        .select('id,title,status,updated_at')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });
      if (error) setErr(error.message); else setPolls(data ?? []);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!userId) {
    return <main style={{ padding: 24 }}>
      <h1>My polls</h1>
      <p>You must <Link href="/auth">sign in</Link> to view your polls.</p>
    </main>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>My polls</h1>
      <p><Link href="/polls/new">+ Create a poll</Link></p>
      {err && <p style={{ color: 'crimson' }}>Error: {err}</p>}
      {polls.length === 0 ? (
        <p>No polls yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {polls.map(p => (
            <li key={p.id} style={{ margin: '12px 0', paddingBottom: 8, borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Link href={`/polls/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{p.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
