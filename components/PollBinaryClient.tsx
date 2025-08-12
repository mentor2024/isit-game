'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import BinaryAssign from './BinaryAssign';
import PollStatsBox from './PollStatsBox';

type Target = 'IS' | 'IT';

export default function PollBinaryClient({
  pollId, leftWord, rightWord, promptWord, correctSide, wordFlip = false, symbolFlip = false,
}: {
  pollId: string;
  leftWord: string;
  rightWord: string;
  promptWord: string;
  correctSide: 'IS' | 'IT' | null;
  wordFlip?: boolean;
  symbolFlip?: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const prevPollId = search.get('prev');
  const grad = search.get('grad');
  const toLevel = search.get('to');
  const sTo = search.get('sto');

  const [userId, setUserId] = useState<string | null>(null);
  const [optIdIS, setOptIdIS] = useState<string | null>(null);
  const [optIdIT, setOptIdIT] = useState<string | null>(null);

  const [assignment, setAssignment] = useState<{ IS: string; IT: string } | null>(null);
  const [chosen, setChosen] = useState<Target | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.from('poll_options').select('id,text').eq('poll_id', pollId).then(({ data }) => {
      const map = new Map<string, string>();
      (data ?? []).forEach(o => map.set((o.text ?? '').toUpperCase(), o.id));
      setOptIdIS(map.get('IS') ?? null);
      setOptIdIT(map.get('IT') ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [pollId]);

  const isReady = useMemo(() => !!(optIdIS && optIdIT), [optIdIS, optIdIT]);
  const canConfirm = !!assignment && !!chosen && isReady;

  const handleAssigned = (a: { IS: string; IT: string }, t: Target) => { setAssignment(a); setChosen(t); };

  const onConfirm = async () => {
    if (!assignment || !chosen) return;
    if (!userId) { router.push('/auth'); return; }
    const optionId = chosen === 'IS' ? optIdIS : optIdIT;
    if (!optionId) return;

    const { error: voteErr } = await supabase.from('poll_votes')
      .upsert({ poll_id: pollId, option_id: optionId, user_id: userId }, { onConflict: 'poll_id,user_id' });
    if (voteErr) return;

    const { data: nextRows } = await supabase.rpc('next_poll_for_user');
    const next = Array.isArray(nextRows) ? nextRows[0] : nextRows;
    if (!next?.next_poll_id) { router.push('/polls'); return; }

    const params = new URLSearchParams();
    params.set('prev', pollId);
    if (next.crossed_stage) { params.set('grad', 'stage'); params.set('sto', String(next.next_stage)); }
    else if (next.crossed_level) { params.set('grad', 'level'); params.set('to', String(next.next_level)); }
    router.push(`/polls/${next.next_poll_id}?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      <div className="space-y-4">
        <PollStatsBox prevPollId={prevPollId} />
      </div>

      <div className="rounded-3xl border border-black/10 p-5 md:p-6 bg-white">
        <BinaryAssign
          leftWord={leftWord}
          rightWord={rightWord}
          onAssigned={handleAssigned}
          wordFlip={wordFlip}
          symbolFlip={symbolFlip}
          footer={
            canConfirm ? (
              <button
                onClick={onConfirm}
                className={[
                  'mx-auto inline-flex items-center justify-center',
                  'w-full sm:w-4/5 md:w-3/5 max-w-xl',
                  'rounded-2xl px-6 py-4 text-lg font-semibold',
                  'bg-black text-white',
                  'outline outline-1 outline-black outline-offset-[3px]',
                ].join(' ')}
              >
                Confirm
              </button>
            ) : null
          }
        />
      </div>
    </div>
  );
}
