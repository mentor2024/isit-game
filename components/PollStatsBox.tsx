'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Row = { id: string; text: string; votes: number };

export default function PollStatsBox({ prevPollId }: { prevPollId: string | null }) {
  const [title, setTitle] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!prevPollId) { setRows(null); setTitle(null); return; }

    (async () => {
      // poll title
      const { data: p } = await supabase.from('polls').select('title').eq('id', prevPollId).maybeSingle();
      setTitle(p?.title ?? 'Previous Poll');

      // options + counts (requires FK poll_votes.option_id -> poll_options.id)
      const { data: opts } = await supabase
        .from('poll_options')
        .select('id,text,poll_votes(count)')
        .eq('poll_id', prevPollId);

      const mapped: Row[] = (opts ?? []).map(o => ({
        id: o.id as string,
        text: (o.text as string) ?? '',
        votes: Array.isArray((o as any).poll_votes) ? ((o as any).poll_votes[0]?.count ?? 0) : 0
      }));
      setRows(mapped);
    })();
  }, [prevPollId]);

  if (!prevPollId) {
    return (
      <div className="rounded-3xl border border-black/10 p-6 md:p-8 bg-white">
        <h2 className="text-xl font-semibold tracking-tight">Previous Results</h2>
        <p className="text-black/60 mt-2">Answer to view results.</p>
      </div>
    );
  }

  const total = (rows ?? []).reduce((s, r) => s + r.votes, 0);
  return (
    <div className="rounded-3xl border border-black/10 p-6 md:p-8 bg-white">
      <h2 className="text-xl font-semibold tracking-tight">Previous Results</h2>
      <p className="text-black/70 mt-1">{title}</p>

      <div className="mt-4 space-y-3">
        {(rows ?? []).map(r => {
          const pct = total > 0 ? Math.round((r.votes / total) * 100) : 0;
          return (
            <div key={r.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.text}</span>
                <span className="text-black/60">{pct}% ({r.votes})</span>
              </div>
              <div className="h-2 rounded bg-black/[0.06]">
                <div className="h-2 rounded bg-black" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-sm text-black/70">
        Instructions pending
      </div>
    </div>
  );
}
