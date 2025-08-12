'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Obj = {
  id: string;
  object_name: string;
  object_type: string;
  file_url: string | null;
  file_path: string | null;
  isit_quotient: number | null;
  created_by: string | null;
  created_at: string | null;
};

export default function ObjectsList() {
  const [rows, setRows] = useState<Obj[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    (async () => {
      setErr(null);
      const [{ data: manage }, me] = await Promise.all([
        supabase.rpc('has_power_current', { p_power: 'objects.manage' }),
        supabase.auth.getUser()
      ]);
      setCanManage(Boolean(manage));

      // Try to read all if you can, else only my objects (RLS will also enforce)
      const canAll = await supabase.rpc('has_power_current', { p_power: 'objects.read_all' });
      let query = supabase.from('objects').select('*').order('created_at', { ascending: false });
      if (!canAll.data) {
        const uid = me.data?.user?.id;
        if (uid) query = query.eq('created_by', uid);
      }
      const { data, error } = await query;
      if (error) setErr(error.message);
      setRows(data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return !n ? rows : rows.filter(r =>
      [r.object_name, r.object_type, r.file_url ?? '', r.file_path ?? '']
      .some(v => String(v).toLowerCase().includes(n))
    );
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      <div className="flex items-center justify-between gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search objects…"
               className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-96" />
        {canManage && (
          <Link href="/objects/editor" className="rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">
            Open editor
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">ISIT Q</th>
              <th className="p-3">File</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t border-black/5">
                <td className="p-3">{o.object_name}</td>
                <td className="p-3">{o.object_type}</td>
                <td className="p-3">{o.isit_quotient ?? '—'}</td>
                <td className="p-3">
                  {o.file_url ? <a href={o.file_url} target="_blank" rel="noreferrer" className="underline">open</a> : (o.file_path ?? '—')}
                </td>
                <td className="p-3 whitespace-nowrap">{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-6 text-center text-black/50" colSpan={5}>No objects.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
