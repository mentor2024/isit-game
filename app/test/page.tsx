'use client';

import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function TestPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('item_scores')
        .select('*')
        .limit(5);
      if (error) setErr(error.message);
      else setRows(data ?? []);
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase test</h1>
      {err && <p style={{ color: 'crimson' }}>Error: {err}</p>}
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </main>
  );
}
