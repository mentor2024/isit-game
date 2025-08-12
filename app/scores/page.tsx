'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type EventRow = {
  id: string;
  function_key: string;
  points: number;
  params: any;
  object_id: string | null;
  poll_id: string | null;
  created_at: string;
  user_id: string;
};

export default function ScoresList() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [canAll, setCanAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: u }, can] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('has_power_current', { p_power: 'scores.read_all' })
      ]);
      setMe(u.user?.id ?? null);
      setCanAll(Boolean(can.data));
      await load(Boolean(can.data), false);
    })();
  }, []);

  async function load(allowAll:boolean, wantAll:boolean) {
    setErr(null);
    let query = supabase.from('score_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!(allowAll && wantAll)) {
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id;
      if (uid) query = query.eq('user_id', uid);
    }
    const { data, error } = await query;
    if (error) setErr(error.message);
    setRows(data ?? []);
  }

  const total = rows.reduce((s, r) => s + (r.user_id === me ? r.points : 0), 0);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return !n ? rows : rows.filter(r =>
      [r.function_key, JSON.stringify(r.params ?? {}), r.object_id ?? '', r.poll_id ?? '']
      .some(v => String(v).toLowerCase().includes(n))
    );
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search scores…"
                 className="rounded-xl border border-black/10 px-3 py-2 w-72" />
          {canAll && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showAll} onChange={async e=>{ setShowAll(e.target.checked); await load(true, e.target.checked); }} />
              View all
            </label>
          )}
        </div>
        <div className="text-sm">
          <span className="font-semibold">My total:</span> {total}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">When</th>
              <th className="p-3">Function</th>
              <th className="p-3">Points</th>
              <th className="p-3">Params</th>
              <th className="p-3">Object</th>
              <th className="p-3">Poll</th>
              <th className="p-3">User</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-t border-black/5">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3 font-mono">{r.function_key}</td>
                <td className="p-3">{r.points}</td>
                <td className="p-3 font-mono text-[12px]">{r.params ? JSON.stringify(r.params) : '—'}</td>
                <td className="p-3">{r.object_id ?? '—'}</td>
                <td className="p-3">{r.poll_id ?? '—'}</td>
                <td className="p-3">{r.user_id.slice(0,8)}…</td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-6 text-center text-black/50" colSpan={7}>No score events.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
