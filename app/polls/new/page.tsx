'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";

type Correct = 'IS' | 'IT';

export default function NewPollPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [word, setWord] = useState('');
  const [correct, setCorrect] = useState<Correct>('IS');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const cleanWord = useMemo(() => word.trim().toUpperCase(), [word]);
  const canSubmit = !!cleanWord && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setMsg(null);
    setBusy(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setMsg('Please sign in first.');
      return;
    }

    // 1) Create the poll row (auto-publish)
    const { data: poll, error: pollErr } = await supabase
      .from('polls')
      .insert([{
        title: cleanWord,
        description: null,
        status: 'published',
        allow_anonymous: false,
        created_by: user.id,
        published_at: new Date().toISOString(),
        kind: 'isit',
        prompt_word: cleanWord,
        correct: correct,
      }])
      .select('id')
      .single();

    if (pollErr || !poll) {
      setBusy(false);
      setMsg(pollErr?.message ?? 'Failed to create poll.');
      return;
    }

    // 2) Add fixed options
    const { error: optErr } = await supabase
      .from('poll_options')
      .insert([
        { poll_id: poll.id, text: 'IS', sort_order: 1 },
        { poll_id: poll.id, text: 'IT', sort_order: 2 },
      ]);

    if (optErr) {
      setBusy(false);
      setMsg(optErr.message);
      return;
    }

    // 3) Go to detail page
    router.push(`/polls/${poll.id}`);
  };

  if (!email) {
    return (
      <section className="grid place-items-center">
        <div className="w-full max-w-lg rounded-3xl border border-black/10 shadow-sm p-8 sm:p-10 bg-white">
          <h1 className="text-3xl font-semibold tracking-tight">New IS/IT Poll</h1>
          <p className="mt-3 text-black/70">
            You must <a href="/auth" className="underline">sign in</a> to create a poll.
          </p>
          <div className="mt-6">
            <a href="/polls" className="underline">← Back to polls</a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid place-items-center">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 shadow-sm p-8 sm:p-10 bg-white">
        <h1 className="text-3xl font-semibold tracking-tight">New IS/IT Poll</h1>
        <p className="mt-2 text-black/70">Enter a single word and choose the correct symbol.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Word</span>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g., HONESTY"
              required
              className="rounded-2xl border border-black/20 px-4 py-3 outline-none focus:ring-2 focus:ring-black/20"
            />
            {cleanWord && (
              <span className="text-xs text-black/50">Preview: <strong className="text-black">{cleanWord}</strong></span>
            )}
          </label>

          <fieldset className="rounded-2xl border border-black/10 p-4">
            <legend className="px-2 text-sm font-medium">Correct answer</legend>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="correct"
                  value="IS"
                  checked={correct === 'IS'}
                  onChange={() => setCorrect('IS')}
                />
                <span>IS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="correct"
                  value="IT"
                  checked={correct === 'IT'}
                  onChange={() => setCorrect('IT')}
                />
                <span>IT</span>
              </label>
            </div>
          </fieldset>

          <button
            disabled={!canSubmit}
            className={[
              "rounded-2xl border px-4 py-3 font-medium transition",
              canSubmit ? "bg-black text-white border-black hover:opacity-90" : "border-black/20 text-black/40 cursor-not-allowed"
            ].join(" ")}
          >
            {busy ? 'Creating…' : 'Create poll'}
          </button>

          {msg && <div className="text-sm text-red-600">{msg}</div>}
        </form>

        <div className="mt-8">
          <a href="/polls" className="underline">← Back to polls</a>
        </div>
      </div>
    </section>
  );
}
