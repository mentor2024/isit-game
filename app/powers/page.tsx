'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

type Row = { power: string; area: string|null; description: string|null; created_at: string|null; };

export default function PowersList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const [{ data, error }, chk] = await Promise.all([
        supabase.from('powers').select('*').order('area', { ascending: true, nullsFirst: true }).order('power',{ascending:true}),
        supabase.rpc('has_power_current', { p_power: 'powers.manage' })
      ]);
      if (error) setErr(error.message);
      setRows(data ?? []);
      setCanManage(Boolean(chk.data));
    })();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return !n ? rows : rows.filter(r =>
      [r.power, r.area ?? '', r.description ?? ''].some(v => String(v).toLowerCase().includes(n))
    );
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      <div className="flex items-center justify-between gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search powers…" className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-96" />
        {canManage && (
          <Link href="/powers/editor" className="rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">
            Open editor
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/5 text-left">
              <th className="p-3">Power</th>
              <th className="p-3">Area</th>
              <th className="p-3">Description</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.power} className="border-t border-black/5">
                <td className="p-3 font-mono">{r.power}</td>
                <td className="p-3">{r.area ?? '—'}</td>
                <td className="p-3">{r.description ?? '—'}</td>
                <td className="p-3 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="p-6 text-center text-black/50" colSpan={4}>No powers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
