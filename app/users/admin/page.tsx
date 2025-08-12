'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  _expanded?: boolean;
  _selected?: boolean;
};

type PowerGrant = {
  power: string;
  area: string | null;
  description: string | null;
  note: string | null;
  granted_at: string | null;
  expires_at: string | null;
};

type SortKey = 'email'|'created_at'|'last_sign_in_at';
type SortDir = 'asc'|'desc';

export default function UsersAdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // search/sort
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('email');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // powers catalog for granting
  const [catalog, setCatalog] = useState<{ power: string, area: string | null }[]>([]);

  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.rpc('has_power_current', { p_power: 'users.manage' });
      if (error) { setAllowed(false); setErr(error.message); return; }
      setAllowed(Boolean(data));
    };
    check();
  }, []);

  useEffect(() => {
    if (allowed !== true) return;
    const load = async () => {
      setLoading(true); setErr(null);
      const [{ data, error }, cat] = await Promise.all([
        supabase.rpc('admin_list_users', { p_q: q || null, p_limit: 500, p_offset: 0 }),
        supabase.from('powers').select('power, area').order('area', { ascending: true, nullsFirst: true }).order('power', { ascending: true })
      ]);
      if (error) setErr(error.message);
      setRows((data ?? []).map((r: any) => ({ ...r, _expanded: false, _selected: false })));
      setCatalog(cat.data ?? []);
      setLoading(false);
    };
    load();
  }, [allowed, q]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return rows.slice().sort((a,b) => {
      const av = sortKey === 'email' ? (a.email ?? '') : Date.parse((a as any)[sortKey] ?? '') || 0;
      const bv = sortKey === 'email' ? (b.email ?? '') : Date.parse((b as any)[sortKey] ?? '') || 0;
      if (sortKey === 'email') return String(av).localeCompare(String(bv)) * dir;
      return (av - bv) * dir;
    });
  }, [rows, sortKey, sortDir]);

  const onHeader = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const toggleExpand = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, _expanded: !r._expanded } : r));
  };

  const [powersByUser, setPowersByUser] = useState<Record<string, PowerGrant[]>>({});
  const loadUserPowers = async (id: string) => {
    if (powersByUser[id]) return;
    const { data, error } = await supabase.rpc('admin_user_powers', { p_user: id });
    if (!error) setPowersByUser(prev => ({ ...prev, [id]: data ?? [] }));
  };

  const grantPower = async (userId: string, power: string, note?: string) => {
    const { error } = await supabase.from('user_powers').insert({
      user_id: userId, power, note: note || null
    });
    if (error) { alert(error.message); return; }
    // refresh the user’s powers
    setPowersByUser(prev => {
      const list = prev[userId] ? [...prev[userId]] : [];
      const cat = catalog.find(c => c.power === power);
      list.unshift({
        power,
        area: cat?.area ?? null,
        description: null,
        note: note || null,
        granted_at: new Date().toISOString(),
        expires_at: null
      });
      return { ...prev, [userId]: list };
    });
  };

  const revokePower = async (userId: string, power: string) => {
    const { error } = await supabase.from('user_powers')
      .delete()
      .eq('user_id', userId)
      .eq('power', power)
      .is('resource_id', null);
    if (error) { alert(error.message); return; }
    setPowersByUser(prev => {
      const list = (prev[userId] ?? []).filter(p => p.power !== power);
      return { ...prev, [userId]: list };
    });
  };

  if (allowed === false) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          You don’t have access (requires users.manage).
        </div>
        {err && <div className="mt-3 text-xs text-red-700">{err}</div>}
      </div>
    );
  }
  if (allowed === null || loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search by email…"
          className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-96"
        />
        <div className="text-xs text-black/60">{rows.length} users</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <SortableTh label="Email" k="email" sortKey={sortKey} sortDir={sortDir} onClick={onHeader} />
              <SortableTh label="Created" k="created_at" sortKey={sortKey} sortDir={sortDir} onClick={onHeader} />
              <SortableTh label="Last sign-in" k="last_sign_in_at" sortKey={sortKey} sortDir={sortDir} onClick={onHeader} />
              <th className="p-3 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(u => (
              <FragmentRow
                key={u.id}
                user={u}
                catalog={catalog}
                grants={powersByUser[u.id] || []}
                onToggle={async ()=>{
                  toggleExpand(u.id);
                  await loadUserPowers(u.id);
                }}
                onGrant={grantPower}
                onRevoke={revokePower}
              />
            ))}
            {!sorted.length && (
              <tr><td className="p-6 text-center text-black/50" colSpan={4}>No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRow(props: {
  user: UserRow;
  catalog: { power: string, area: string | null }[];
  grants: PowerGrant[];
  onToggle: () => void;
  onGrant: (userId: string, power: string, note?: string) => void;
  onRevoke: (userId: string, power: string) => void;
}) {
  const { user, catalog, grants, onToggle, onGrant, onRevoke } = props;
  const [selPower, setSelPower] = useState<string>('');
  const [note, setNote] = useState<string>('');

  return (
    <>
      <tr className="border-t border-black/5 align-top">
        <td className="p-3">
          <div className="font-medium">{user.email ?? '(no email)'}</div>
        </td>
        <td className="p-3 whitespace-nowrap">{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</td>
        <td className="p-3 whitespace-nowrap">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</td>
        <td className="p-3">
          <button
            onClick={onToggle}
            className="rounded-xl border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
          >
            {user._expanded ? 'Hide powers' : 'Manage powers'}
          </button>
        </td>
      </tr>

      {user._expanded && (
        <tr className="border-t border-black/5 bg-black/2">
          <td colSpan={4} className="p-3">
            {/* Grant power */}
            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-3">
              <div>
                <label className="block text-xs text-black/60 mb-1">Power</label>
                <select value={selPower} onChange={(e)=>setSelPower(e.target.value)}
                        className="rounded-lg border border-black/10 px-2 py-1 md:w-72">
                  <option value="">Select a power…</option>
                  {catalog.map(c => (
                    <option key={c.power} value={c.power}>
                      {c.power}{c.area ? `  —  ${c.area}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:flex-1">
                <label className="block text-xs text-black/60 mb-1">Note (optional)</label>
                <input value={note} onChange={(e)=>setNote(e.target.value)}
                       className="w-full rounded-lg border border-black/10 px-2 py-1" placeholder="e.g., temporary access" />
              </div>
              <div>
                <button
                  onClick={()=>{ if (selPower) onGrant(user.id, selPower, note); }}
                  disabled={!selPower}
                  className="rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px] disabled:opacity-50"
                >
                  Grant
                </button>
              </div>
            </div>

            {/* Current powers */}
            <div className="flex flex-wrap gap-2">
              {grants.map(g => (
                <span key={g.power} className="inline-flex items-center gap-2 rounded-full border border-black/15 px-3 py-1 text-xs bg-white">
                  <span className="font-mono">{g.power}</span>
                  <button
                    onClick={()=>onRevoke(user.id, g.power)}
                    className="rounded border border-black/10 px-1 py-0.5 text-[10px] hover:bg-black/5"
                    title="Revoke"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {!grants.length && <span className="text-xs text-black/50">No powers yet.</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onClick
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const arrow = sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
  return (
    <th className="p-3 select-none">
      <button type="button" onClick={()=>onClick(k)} className="inline-flex items-center gap-1 hover:underline">
        <span>{label}</span>
        <span className="text-[10px] text-black/50">{arrow}</span>
      </button>
    </th>
  );
}
