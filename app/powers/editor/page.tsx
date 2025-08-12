'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from "@/lib/supabase";

type PowerRow = {
  power: string;        // PK
  area: string | null;
  description: string | null;
  created_at: string | null;
  _selected?: boolean;
  _status?: 'idle' | 'saving' | 'saved' | 'error';
  _dirty?: boolean;     // local flag to enable row Submit if you prefer manual saves later
};

type SortKey = 'power'|'area'|'created_at';
type SortDir = 'asc'|'desc';

export default function PowersPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<PowerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Sorting + filtering
  const [sortKey, setSortKey] = useState<SortKey>('area');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [q, setQ] = useState('');

  // Add-single form
  const [newPower, setNewPower] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  // CSV import
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvInfo, setCsvInfo] = useState<string>('');

  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.rpc('has_power_current', { p_power: 'powers.manage' });
      if (error) { setAllowed(false); setErr(error.message); return; }
      setAllowed(Boolean(data));
    };
    check();
  }, []);

  useEffect(() => {
    if (allowed !== true) return;
    const load = async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from('powers')
        .select('*')
        .order('area', { ascending: true, nullsFirst: true })
        .order('power', { ascending: true });
      if (error) setErr(error.message);
      setRows((data ?? []).map((r: any) => ({ ...r, _selected: false, _status: 'idle' })));
      setLoading(false);
    };
    load();
  }, [allowed]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter(r => {
      if (!needle) return true;
      return [r.power, r.area ?? '', r.description ?? ''].some(v => String(v).toLowerCase().includes(needle));
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return list.sort((a,b) => {
      let av:any = a[sortKey]; let bv:any = b[sortKey];
      if (sortKey === 'created_at') {
        av = av ? Date.parse(av) : 0;
        bv = bv ? Date.parse(bv) : 0;
        return (av - bv) * dir;
      }
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [rows, q, sortKey, sortDir]);

  const allVisibleChecked = filtered.length > 0 && filtered.every(r => r._selected);
  const selected = rows.filter(r => r._selected);

  const onHeader = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const markStatus = (power: string, s: PowerRow['_status']) => {
    setRows(prev => prev.map(r => r.power === power ? { ...r, _status: s } : r));
  };

  const updateLocal = (power: string, patch: Partial<Pick<PowerRow,'area'|'description'>>) => {
    setRows(prev => prev.map(r => r.power === power ? { ...r, ...patch, _dirty: true } : r));
  };

  const saveRow = async (r: PowerRow) => {
    markStatus(r.power, 'saving'); setErr(null);
    try {
      const { error } = await supabase.from('powers')
        .update({ area: r.area, description: r.description })
        .eq('power', r.power);
      if (error) throw error;
      setRows(prev => prev.map(x => x.power === r.power ? { ...x, _dirty: false } : x));
      markStatus(r.power, 'saved');
      setTimeout(() => markStatus(r.power, 'idle'), 1200);
    } catch (e:any) {
      markStatus(r.power, 'error'); setErr(e.message || String(e));
    }
  };

  const deleteSelected = async () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} power(s)? This will cascade delete any user grants that reference them.`)) return;
    setErr(null);
    const list = selected.map(s => s.power);
    const { error } = await supabase.from('powers').delete().in('power', list);
    if (error) { setErr(error.message); return; }
    setRows(prev => prev.filter(r => !list.includes(r.power)));
  };

  const addOne = async () => {
    if (!newPower.trim()) { alert('Power is required (e.g., polls.update)'); return; }
    setAdding(true); setErr(null);
    try {
      const row = { power: newPower.trim(), area: newArea || null, description: newDesc || null };
      const { error } = await supabase.from('powers').insert(row);
      if (error) throw error;
      setRows(prev => [{ ...row, created_at: new Date().toISOString(), _selected:false, _status:'idle' }, ...prev]);
      setNewPower(''); setNewArea(''); setNewDesc('');
    } catch (e:any) {
      setErr(e.message || String(e));
    } finally {
      setAdding(false);
    }
  };

  // Simple CSV parser (handles quoted fields and commas inside quotes)
  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i=0; i<text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i+1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cur.push(field); field = '';
      } else if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && text[i+1] === '\n') i++; // handle CRLF
        cur.push(field); field = '';
        if (cur.some(v => v !== '' || rows.length === 0)) rows.push(cur);
        cur = [];
      } else {
        field += c;
      }
    }
    if (field.length || cur.length) { cur.push(field); rows.push(cur); }
    return rows;
  };

  const importCSV = async (file: File) => {
    setCsvBusy(true); setCsvInfo('Parsing CSV…'); setErr(null);
    try {
      const txt = await file.text();
      const table = parseCSV(txt);
      if (table.length < 2) throw new Error('CSV requires a header row plus at least one data row.');

      const headers = table[0].map(h => h.trim().toLowerCase());
      const idxPower = headers.indexOf('power');
      const idxArea  = headers.indexOf('area');
      const idxDesc  = headers.indexOf('description');
      if (idxPower === -1) throw new Error('CSV must include a "power" column header.');

      const payload = table.slice(1).map(r => ({
        power: (r[idxPower] ?? '').trim(),
        area: idxArea >= 0 ? (r[idxArea] ?? '').trim() || null : null,
        description: idxDesc >= 0 ? (r[idxDesc] ?? '').trim() || null : null
      })).filter(x => x.power);

      if (!payload.length) throw new Error('No rows with "power" values found.');

      setCsvInfo(`Upserting ${payload.length} rows…`);
      const chunkSize = 500;
      for (let i=0; i<payload.length; i+=chunkSize) {
        const chunk = payload.slice(i, i+chunkSize);
        const { error } = await supabase.from('powers').upsert(chunk, { onConflict: 'power' });
        if (error) throw error;
        setCsvInfo(`Upserted ${Math.min(i+chunkSize, payload.length)} / ${payload.length}`);
      }

      // Reload fresh
      const { data, error } = await supabase.from('powers').select('*').order('area', { ascending: true, nullsFirst: true }).order('power', { ascending: true });
      if (error) throw error;
      setRows((data ?? []).map((r: any) => ({ ...r, _selected:false, _status:'idle' })));
      setCsvInfo(`Done! Imported ${payload.length} row(s).`);
      setTimeout(() => setCsvInfo(''), 1500);
    } catch (e:any) {
      setErr(e.message || String(e)); setCsvInfo('');
    } finally {
      setCsvBusy(false);
    }
  };

  if (allowed === false) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          You don’t have access to manage powers (requires powers.manage).
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

      {/* Add single + CSV import */}
      <div className="rounded-2xl border border-black/10 bg-white p-3 md:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-black/60 mb-1">Power (required)</label>
            <input value={newPower} onChange={e=>setNewPower(e.target.value)} placeholder="e.g. polls.update"
                   className="w-full rounded-lg border border-black/10 px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-black/60 mb-1">Area</label>
            <input value={newArea} onChange={e=>setNewArea(e.target.value)} placeholder="e.g. polls"
                   className="w-full rounded-lg border border-black/10 px-2 py-1" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-black/60 mb-1">Description</label>
            <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="What this power allows"
                   className="w-full rounded-lg border border-black/10 px-2 py-1" />
          </div>
          <div>
            <button
              onClick={addOne}
              disabled={adding}
              className="w-full rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px] disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add power'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs text-black/60">Import CSV (headers: <code className="bg-black/5 px-1 rounded">power</code>, optional <code className="bg-black/5 px-1 rounded">area</code>, <code className="bg-black/5 px-1 rounded">description</code>)</div>
          <input type="file" accept=".csv,text/csv" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) void importCSV(f); }} />
          {csvBusy && <span className="text-xs text-black/60">{csvInfo}</span>}
          {!csvBusy && csvInfo && <span className="text-xs text-black/60">{csvInfo}</span>}
        </div>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search power / area / description…"
          className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-80"
        />
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <button onClick={deleteSelected}
                    className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5">
              Delete selected ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allVisibleChecked}
                  onChange={(e)=>{
                    const checked = e.target.checked;
                    setRows(prev => prev.map(r => filtered.some(f => f.power === r.power) ? { ...r, _selected: checked } : r));
                  }}
                />
              </th>
              <SortableTh label="Power" k="power" sortKey={sortKey} sortDir={sortDir} onClick={onHeader} />
              <SortableTh label="Area"  k="area"  sortKey={sortKey} sortDir={sortDir} onClick={onHeader} />
              <SortableTh label="Created" k="created_at" sortKey={sortKey} sortDir={sortDir} onClick={onHeader} />
              <th className="p-3">Description</th>
              <th className="p-3 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.power} className="border-t border-black/5 align-top">
                <td className="p-3">
                  <input type="checkbox" className="h-4 w-4"
                         checked={!!r._selected}
                         onChange={(e)=>setRows(prev => prev.map(x => x.power===r.power ? { ...x, _selected: e.target.checked } : x))} />
                </td>

                {/* Power (PK) - read-only (changing it would break FKs). To rename, add a new row then delete old. */}
                <td className="p-3">
                  <div className="font-mono text-[13px]">{r.power}</div>
                </td>

                {/* Area (inline, autosave on blur) */}
                <td className="p-3">
                  <input
                    value={r.area ?? ''}
                    onChange={(e)=>updateLocal(r.power, { area: e.target.value || null })}
                    onBlur={()=>{ if (r._dirty) void saveRow({ ...r, _dirty: false }); }}
                    className="w-40 rounded-lg border border-black/10 px-2 py-1"
                  />
                </td>

                {/* Created */}
                <td className="p-3 whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                </td>

                {/* Description (inline, autosave on blur) */}
                <td className="p-3">
                  <input
                    value={r.description ?? ''}
                    onChange={(e)=>updateLocal(r.power, { description: e.target.value || null })}
                    onBlur={()=>{ if (r._dirty) void saveRow({ ...r, _dirty: false }); }}
                    className="w-full md:w-[28rem] rounded-lg border border-black/10 px-2 py-1"
                  />
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={()=>saveRow(r)}
                      disabled={r._status==='saving' || !r._dirty}
                      className="rounded-xl bg-black text-white px-3 py-1.5 text-xs outline outline-1 outline-black outline-offset-[2px] disabled:opacity-50"
                    >
                      {r._status==='saving' ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={async ()=>{
                        if (!confirm(`Delete "${r.power}"? This will cascade delete any user grants referencing it.`)) return;
                        const { error } = await supabase.from('powers').delete().eq('power', r.power);
                        if (error) { setErr(error.message); return; }
                        setRows(prev => prev.filter(x => x.power !== r.power));
                      }}
                      className="rounded-xl border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="p-6 text-center text-black/50" colSpan={6}>No powers match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
