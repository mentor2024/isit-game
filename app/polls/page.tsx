'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  title: string | null;
  kind: string | null;
  correct: 'IS'|'IT'|null;
  stage: number | null;
  level: string | null;
  mirror: boolean | null;
  poll_image_url: string | null;
};

export default function PollsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState('');
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    (async () => {
      // Prefer all → else mine → else nothing (stay simple for now)
      const canAll = await supabase.rpc('has_power_current', { p_power: 'polls.read_all' });
      const canEdit = await supabase.rpc('has_power_current', { p_power: 'polls.manage' });
      setCanManage(Boolean(canEdit.data));

      let res;
      if (canAll.data || canEdit.data) {
        res = await supabase.rpc('admin_poll_meta_all');
      } else {
        // Try "mine" (if user has the power); if not, fallback to an empty list (or we could show published later)
        const canMine = await supabase.rpc('has_power_current', { p_power: 'polls.read_mine' });
        res = canMine.data ? await supabase.rpc('admin_poll_meta_mine') : { data: [], error: null };
      }
      if (res.error) setErr(res.error.message);
      setRows(res.data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return !n ? rows : rows.filter(r =>
      [r.title ?? '', r.kind ?? '', r.level ?? '', r.correct ?? ''].some(v => String(v).toLowerCase().includes(n))
    );
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      <div className="flex items-center justify-between gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search polls…"
               className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-96" />
        {canManage && (
          <Link href="/polls/editor" className="rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">
            Open editor
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">Title</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Level</th>
              <th className="p-3">Correct</th>
              <th className="p-3">Type</th>
              <th className="p-3">Mirror</th>
              <th className="p-3">Image</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-black/5">
                <td className="p-3">{r.title ?? '—'}</td>
                <td className="p-3">{r.stage ?? '—'}</td>
                <td className="p-3">{r.level ?? '—'}</td>
                <td className="p-3">{r.correct ?? '—'}</td>
                <td className="p-3">{r.kind ?? '—'}</td>
                <td className="p-3">{String(!!r.mirror)}</td>
                <td className="p-3">{r.poll_image_url ? <img src={r.poll_image_url} className="h-8 w-8 rounded object-cover" alt="" /> : '—'}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="p-6 text-center text-black/50" colSpan={7}>No polls.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
