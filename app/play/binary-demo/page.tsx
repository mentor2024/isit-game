import BinaryAssign from '../../../components/BinaryAssign';

export default function BinaryDemoPage() {
  // You can change these two to try other pairs
  const left = 'VERB';
  const right = 'NOUN';

  return (
    <main className="py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Binary Poll — Demo</h1>
      <p className="mt-2 text-black/70">Drag a word down to IS or IT, or click a word and then click a symbol.</p>

      <div className="mt-6">
        <BinaryAssign leftWord={left} rightWord={right} />
      </div>

      <div className="mt-8">
        <a href="/" className="underline">← Back to home</a>
      </div>
    </main>
  );
}
