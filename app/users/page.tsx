'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

type Row = { id: string; email: string|null; created_at: string|null; last_sign_in_at: string|null; };

export default function UsersList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState('');
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    (async () => {
      setErr(null);
      const manage = await supabase.rpc('has_power_current', { p_power: 'users.manage' });
      setCanManage(Boolean(manage.data));

      if (manage.data) {
        const { data, error } = await supabase.rpc('admin_list_users', { p_q: null, p_limit: 500, p_offset: 0 });
        if (error) setErr(error.message);
        setRows(data ?? []);
      } else {
        const { data: user } = await supabase.auth.getUser();
        const u = user?.user;
        if (u) {
          setRows([{ id: u.id, email: u.email ?? null, created_at: u.created_at ?? null, last_sign_in_at: (u as any).last_sign_in_at ?? null }]);
        } else {
          setRows([]);
        }
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return !n ? rows : rows.filter(r => (r.email ?? '').toLowerCase().includes(n));
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      <div className="flex items-center justify-between gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search users…"
               className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-96" />
        {canManage && (
          <Link href="/users/admin" className="rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">
            Open admin
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">Email</th>
              <th className="p-3">Created</th>
              <th className="p-3">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-t border-black/5">
                <td className="p-3">{u.email ?? '—'}</td>
                <td className="p-3 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                <td className="p-3 whitespace-nowrap">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="p-6 text-center text-black/50" colSpan={3}>No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
