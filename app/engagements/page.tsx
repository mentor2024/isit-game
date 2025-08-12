'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = { key: string; label: string; sort: number; created_at: string|null };
type SortField = 'key' | 'label' | 'sort';
type SortDir = 'asc' | 'desc';

export default function EngagementTypesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  // add form
  const [keyInput, setKeyInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [sortInput, setSortInput] = useState<number>(0);

  // filtering/sorting
  const [q, setQ] = useState('');
  const [sortField, setSortField] = useState<SortField>('sort');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('engagement_types')
      .select('*')
      .order('sort', { ascending: true })
      .order('label', { ascending: true });
    setErr(error?.message ?? null);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const cleanKey = keyInput.trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
    if (!cleanKey) { setErr('Key is required'); return; }
    if (!labelInput.trim()) { setErr('Label is required'); return; }
    const { error } = await supabase
      .from('engagement_types')
      .insert({ key: cleanKey, label: labelInput.trim(), sort: sortInput|0 });
    if (error) setErr(error.message);
    else {
      setKeyInput(''); setLabelInput(''); setSortInput(0);
      load();
    }
  };

  const updateRow = async (r: Row, patch: Partial<Row>) => {
    const { error } = await supabase.from('engagement_types').update(patch).eq('key', r.key);
    if (error) setErr(error.message);
    else load();
  };

  const deleteRow = async (r: Row) => {
    if (!confirm(`Delete engagement type "${r.label}"?`)) return;
    const { error } = await supabase.from('engagement_types').delete().eq('key', r.key);
    if (error) setErr(error.message);
    else load();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (needle) {
      list = list.filter(r =>
        r.key.toLowerCase().includes(needle) ||
        (r.label ?? '').toLowerCase().includes(needle)
      );
    }
    list = [...list].sort((a,b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'sort') return (a.sort - b.sort) * dir;
      const A = String(a[sortField] ?? '').toLowerCase();
      const B = String(b[sortField] ?? '').toLowerCase();
      return A < B ? -1*dir : A > B ? 1*dir : 0;
    });
    return list;
  }, [rows, q, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Engagements</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link href="/engagements"
          className="px-3 py-1.5 rounded-xl text-sm bg-black text-white">Types</Link>
        <Link href="/engagements/matrix"
          className="px-3 py-1.5 rounded-xl text-sm hover:bg-black/5">Matrix</Link>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs mb-1">Key</label>
          <input
            value={keyInput}
            onChange={e=>setKeyInput(e.target.value)}
            placeholder="like_dislike"
            className="w-full border border-black/10 rounded-xl px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Label</label>
          <input
            value={labelInput}
            onChange={e=>setLabelInput(e.target.value)}
            placeholder="Like/Dislike"
            className="w-full border border-black/10 rounded-xl px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Sort</label>
          <input
            type="number"
            value={Number.isFinite(sortInput) ? sortInput : 0}
            onChange={e=>setSortInput(parseInt(e.target.value||'0'))}
            className="w-full border border-black/10 rounded-xl px-3 py-2"
          />
        </div>
        <button className="rounded-xl bg-black text-white px-3 py-2 outline outline-1 outline-black outline-offset-[2px]">
          Add
        </button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/60">Total: {rows.length}</div>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Filter by key or label…"
          className="w-64 border border-black/10 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border border-black/10 rounded-xl overflow-hidden">
          <thead className="bg-black/5">
            <tr>
              <Th label="Key"   field="key"  sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Label" field="label" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Sort"  field="sort" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
              <th className="text-left px-3 py-2 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-sm">No rows.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.key} className="border-t border-black/10">
                <td className="px-3 py-2 text-sm font-mono">{r.key}</td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={r.label ?? ''}
                    onBlur={e=>{
                      const v=e.target.value.trim();
                      if (v!== (r.label ?? '')) updateRow(r,{label:v});
                    }}
                    className="w-full border border-transparent hover:border-black/10 rounded-lg px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    defaultValue={r.sort ?? 0}
                    onBlur={e=>{
                      const v=Number(e.target.value||0);
                      if (v!== (r.sort ?? 0)) updateRow(r,{sort:v});
                    }}
                    className="w-24 border border-transparent hover:border-black/10 rounded-lg px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={()=>deleteRow(r)}
                    className="text-sm rounded-lg border border-black/10 px-2 py-1 hover:bg-black/5"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th(props: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir; onClick: (f: SortField)=>void;
}) {
  const active = props.sortField === props.field;
  return (
    <th
      onClick={()=>props.onClick(props.field)}
      className="text-left px-3 py-2 text-xs cursor-pointer select-none"
      title="Click to sort"
    >
      <span className={active ? 'underline' : ''}>{props.label}</span>
      {active ? (props.sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}
