'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugAuth() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    })();
  }, []);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-lg font-semibold">Auth Debug</h1>
      <pre className="p-3 rounded-lg border border-black/10 bg-black/5 text-xs overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  );
}
