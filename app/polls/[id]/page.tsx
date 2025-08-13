export const dynamic = "force-dynamic";
export const revalidate = 0;
import { supabase } from "@/lib/supabase";
import PollBinaryClient from '../../../components/PollBinaryClient';

export default async function PollDetail({ params }: { params: { id: string } }) {
  const pollId = params.id;

  // Load poll
  const { data: poll } = await supabase
    .from('polls')
    .select('id,title,status,kind,prompt_word,correct,published_at')
    .eq('id', pollId)
    .single();

  if (!poll) {
    return <main className="py-12 text-center">Poll not found.</main>;
  }

  // Load both linked objects (IS + IT). If we can't, show a friendly message.
  const { data: links } = await supabase
    .from('poll_object_links')
    .select('side, object_id')
    .eq('poll_id', pollId);

  if (!links || links.length < 2) {
    return (
      <main className="py-12 text-center">
        <div className="max-w-xl mx-auto rounded-2xl border border-black/10 p-6">
          <h1 className="text-xl font-semibold">Poll not fully configured</h1>
          <p className="mt-2 text-black/70">
            This poll is missing its pair links. Please try another poll.
          </p>
        </div>
      </main>
    );
  }

  const ids = links.map((l) => l.object_id as string);
  const { data: objs } = await supabase
    .from('poll_objects')
    .select('id, word, correct, pair_text')
    .in('id', ids);

  // Map side -> word from the two links; don't use placeholders.
  const byId = new Map(objs?.map((o) => [o.id, o.word]) ?? []);
  const isId = links.find((l) => l.side === 'IS')?.object_id as string | undefined;
  const itId = links.find((l) => l.side === 'IT')?.object_id as string | undefined;

  let leftWord: string | null = null;
  let rightWord: string | null = null;

  if (isId && itId) {
    const isWord = byId.get(isId) ?? null;
    const itWord = byId.get(itId) ?? null;

    if (isWord && itWord) {
      leftWord = isWord;  // canonical order: IS on the left (UI may flip randomly later)
      rightWord = itWord;
    }
  }

  // Final defensive fallback: split title if it contains a pipe
  if (!leftWord || !rightWord) {
    if (poll.title?.includes('|')) {
      const [a, b] = poll.title.split('|').map((s) => s.trim());
      if (a && b) {
        leftWord = a;
        rightWord = b;
      }
    }
  }

  if (!leftWord || !rightWord) {
    return (
      <main className="py-12 text-center">
        <div className="max-w-xl mx-auto rounded-2xl border border-black/10 p-6">
          <h1 className="text-xl font-semibold">Poll missing pair words</h1>
          <p className="mt-2 text-black/70">Please try another poll.</p>
        </div>
      </main>
    );
  }

  // Random flips on the server to avoid hydration mismatch
  const wordFlip = Math.random() < 0.5;
  const symbolFlip = Math.random() < 0.5;

  return (
    <main className="min-h-screen flex items-center justify-center py-6">
      <div className="w-full max-w-6xl px-4">
        <PollBinaryClient
          pollId={pollId}
          leftWord={leftWord}
          rightWord={rightWord}
          promptWord={poll.prompt_word ?? leftWord}
          correctSide={(poll.correct as 'IS' | 'IT' | null) ?? null}
          wordFlip={wordFlip}
          symbolFlip={symbolFlip}
        />
      </div>
    </main>
  );
}
