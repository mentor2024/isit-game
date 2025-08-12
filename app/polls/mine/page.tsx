'use client';

import { useEffect, useState } from 'react';
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

export default function PollsViewMine() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase.rpc('admin_poll_meta_mine');
      if (error) setErr(error.message);
      setRows(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-3">My polls (read-only)</h1>
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">Title</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Level</th>
              <th className="p-3">Correct</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Mirror</th>
              <th className="p-3">Image</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-black/5">
                <td className="p-3">{r.title ?? '—'}</td>
                <td className="p-3">{r.stage ?? '—'}</td>
                <td className="p-3">{r.level ?? '—'}</td>
                <td className="p-3">{r.correct ?? '—'}</td>
                <td className="p-3">{r.kind ?? '—'}</td>
                <td className="p-3">{String(!!r.mirror)}</td>
                <td className="p-3">{r.poll_image_url ? <img src={r.poll_image_url} alt="" className="h-8 w-8 rounded object-cover" /> : '—'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-6 text-center text-black/50" colSpan={7}>No data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
