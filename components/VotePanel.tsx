'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';

type Option = { id: string; text: string };
type Result = { option_id: string; vote_count: number; percentage: number; total_votes: number };

const iconFor = (label: string) => {
  const t = (label || '').toUpperCase();
  if (t === 'IS') return '/images/icon_is_100x100.png';
  if (t === 'IT') return '/images/icon_it_100x100.png';
  return '/images/icon_is_100x100.png';
};

export default function VotePanel({
  pollId,
  options,
  correct,
  canVote = true,
  initialResults = [],
}: {
  pollId: string;
  options: Option[];
  correct?: 'IS' | 'IT' | null;
  canVote?: boolean;
  initialResults?: Result[];
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [myOptionId, setMyOptionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>(initialResults);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setUserId(user?.id ?? null);

      if (user?.id) {
        const { data } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', pollId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.option_id) setMyOptionId(data.option_id);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [pollId]);

  const refreshResults = async () => {
    const { data } = await supabase
      .from('poll_results')
      .select('option_id,vote_count,percentage,total_votes')
      .eq('poll_id', pollId);
    setResults(data ?? []);
  };

  const castVote = async (optionId: string) => {
    setMsg(null);
    if (!canVote) { setMsg('This poll is not accepting votes.'); return; }
    if (!userId) { setMsg('Please sign in to vote.'); return; }
    setBusy(true);
    const { error } = await supabase
      .from('poll_votes')
      .upsert({ poll_id: pollId, option_id: optionId, user_id: userId }, { onConflict: 'poll_id,user_id' });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMyOptionId(optionId);
    await refreshResults();

    const picked = options.find(o => o.id === optionId)?.text?.toUpperCase();
    if (picked && (correct === 'IS' || correct === 'IT')) {
      setMsg(picked === correct ? '✅ Correct!' : `❌ Not quite. Correct is ${correct}.`);
    } else {
      setMsg('Vote recorded.');
    }
  };

  const resultMap = new Map(results.map(r => [r.option_id, r]));

  return (
    <section className="mt-4">
      {!email && (
        <p className="mb-3 text-sm text-black/70">
          <a href="/auth" className="underline">Sign in</a> to vote.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        {options.map(o => {
          const r = resultMap.get(o.id);
          const picked = myOptionId === o.id;
          return (
            <button
              key={o.id}
              onClick={() => castVote(o.id)}
              disabled={busy || !email || !canVote}
              className={[
                'rounded-3xl border px-5 py-4 text-left transition',
                picked ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black',
                (busy || !email || !canVote) ? 'opacity-60 cursor-not-allowed' : ''
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Image src={iconFor(o.text)} alt={o.text} width={36} height={36} className="rounded-lg ring-1 ring-black/10" />
                  <span className="text-lg font-semibold">{o.text}</span>
                </div>
                <span className="text-sm opacity-80">
                  {r ? `${r.vote_count} • ${r.percentage}%` : '0 • 0%'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {msg && <p className="mt-3">{msg}</p>}
    </section>
  );
}
