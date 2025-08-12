'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Et = { key: string; label: string };
type Ot = { key: string; label: string };
type Row = {
  id: string;
  engagement_type_key: string;
  object_type_key: string | null;
  label: string;
  sort: number;
  active: boolean;
  engagement_types?: { label: string|null };
  object_types?: { label: string|null } | null;
};

type SortField = 'label' | 'et' | 'ot' | 'sort' | 'active';
type SortDir = 'asc' | 'desc';

export default function EngagementsMatrixPage() {
  const [ets, setEts] = useState<Et[]>([]);
  const [ots, setOts] = useState<Ot[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  // filters
  const [fEt, setFEt] = useState<string>('');      // engagement type key
  const [fOt, setFOt] = useState<string>('');      // object type key or '' for all, 'null' for global
  const [fActive, setFActive] = useState<'all'|'yes'|'no'>('all');
  const [q, setQ] = useState('');

  // sorting
  const [sortField, setSortField] = useState<SortField>('sort');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // add form
  const [newEt, setNewEt] = useState<string>('');
  const [newOt, setNewOt] = useState<string>(''); // '' => null/global
  const [newLabel, setNewLabel] = useState<string>('');
  const [newSort, setNewSort] = useState<number>(0);
  const [newActive, setNewActive] = useState<boolean>(true);

  const loadOptions = async () => {
    const [{ data: dets }, { data: dots }] = await Promise.all([
      supabase.from('engagement_types').select('key,label').order('sort'),
      supabase.from('object_types').select('key,label').order('sort')
    ]);
    setEts((dets ?? []) as Et[]);
    setOts((dots ?? []) as Ot[]);
  };

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('engagements')
      .select(`
        id, engagement_type_key, object_type_key, label, sort, active,
        engagement_types ( label ),
        object_types ( label )
      `)
      .order('sort', { ascending: true })
      .order('label', { ascending: true });
    setErr(error?.message ?? null);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { loadOptions(); loadRows(); }, []);

  // auto label helper for add form
  useEffect(() => {
    if (newLabel.trim()) return;
    const et = ets.find(e => e.key === newEt)?.label ?? '';
    const ot = newOt === '' ? 'Global' : (ots.find(o => o.key === newOt)?.label ?? '');
    if (!et) return;
    const prefix = labelPrefix(newEt, et);
    setNewLabel((prefix + (newOt ? ot : '')).trim());
  }, [newEt, newOt, ets, ots]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = rows.map(r => ({
      ...r,
      etLabel: r.engagement_types?.label ?? '',
      otLabel: r.object_type_key ? (r.object_types?.label ?? '') : 'Global'
    }));

    if (fEt)  list = list.filter(r => r.engagement_type_key === fEt);
    if (fOt)  list = list.filter(r => fOt === 'null' ? r.object_type_key === null : r.object_type_key === fOt);
    if (fActive !== 'all') list = list.filter(r => (fActive === 'yes') ? r.active : !r.active);

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(r =>
        r.label.toLowerCase().includes(needle) ||
        r.etLabel.toLowerCase().includes(needle) ||
        (r.otLabel ?? '').toLowerCase().includes(needle)
      );
    }

    const dir = (sortDir === 'asc') ? 1 : -1;
    list = [...list].sort((a,b) => {
      if (sortField === 'sort') return (a.sort - b.sort) * dir;
      if (sortField === 'active') return ((a.active?1:0) - (b.active?1:0)) * dir;
      const A = (sortField === 'label' ? a.label : sortField === 'et' ? a.etLabel : a.otLabel).toLowerCase();
      const B = (sortField === 'label' ? b.label : sortField === 'et' ? b.etLabel : b.otLabel).toLowerCase();
      return A < B ? -1*dir : A > B ? 1*dir : 0;
    });
    return list;
  }, [rows, fEt, fOt, fActive, q, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const addRow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const payload = {
      engagement_type_key: newEt,
      object_type_key: newOt === '' ? null : newOt,
      label: newLabel.trim(),
      sort: newSort|0,
      active: newActive
    };
    const { error } = await supabase.from('engagements').insert(payload);
    if (error) setErr(error.message);
    else {
      setNewEt(''); setNewOt(''); setNewLabel(''); setNewSort(0); setNewActive(true);
      loadRows();
    }
  };

  const updateRow = async (r: Row, patch: Partial<Row>) => {
    const { error } = await supabase.from('engagements').update(patch).eq('id', r.id);
    if (error) setErr(error.message);
    else loadRows();
  };

  const deleteRow = async (r: Row) => {
    if (!confirm(`Delete "${r.label}"?`)) return;
    const { error } = await supabase.from('engagements').delete().eq('id', r.id);
    if (error) setErr(error.message);
    else loadRows();
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Engagements</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link href="/engagements" className="px-3 py-1.5 rounded-xl text-sm hover:bg-black/5">Types</Link>
        <Link href="/engagements/matrix" className="px-3 py-1.5 rounded-xl text-sm bg-black text-white">Matrix</Link>
      </div>

      {/* Add row */}
      <form onSubmit={addRow} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1">Engagement Type</label>
          <select value={newEt} onChange={e=>setNewEt(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2" required>
            <option value="" disabled>Select…</option>
            {ets.map(et => <option key={et.key} value={et.key}>{et.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1">Object Type</label>
          <select value={newOt} onChange={e=>setNewOt(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2">
            <option value="">Global (none)</option>
            {ots.map(ot => <option key={ot.key} value={ot.key}>{ot.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1">Label</label>
          <input value={newLabel} onChange={e=>setNewLabel(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2" placeholder="Auto-filled from selections" required />
        </div>
        <div>
          <label className="block text-xs mb-1">Sort</label>
          <input type="number" value={newSort} onChange={e=>setNewSort(parseInt(e.target.value||'0'))}
            className="w-full border border-black/10 rounded-xl px-3 py-2" />
        </div>
        <div className="flex items-center gap-2">
          <input id="newActive" type="checkbox" checked={newActive} onChange={e=>setNewActive(e.target.checked)} />
          <label htmlFor="newActive" className="text-sm">Active</label>
        </div>
        <button className="rounded-xl bg-black text-white px-3 py-2 outline outline-1 outline-black outline-offset-[2px]">
          Add
        </button>
      </form>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs mb-1">Filter: Engagement Type</label>
          <select value={fEt} onChange={e=>setFEt(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2">
            <option value="">All</option>
            {ets.map(et => <option key={et.key} value={et.key}>{et.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Filter: Object Type</label>
          <select value={fOt} onChange={e=>setFOt(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-3 py-2">
            <option value="">All</option>
            <option value="null">Global (none)</option>
            {ots.map(ot => <option key={ot.key} value={ot.key}>{ot.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Active</label>
          <select value={fActive} onChange={e=>setFActive(e.target.value as any)}
            className="w-full border border-black/10 rounded-xl px-3 py-2">
            <option value="all">All</option>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1">Search</label>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Label / type / object…"
            className="w-full border border-black/10 rounded-xl px-3 py-2" />
        </div>
      </div>

      {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-black/10 rounded-xl overflow-hidden">
          <thead className="bg-black/5">
            <tr>
              <Th label="Label" field="label" sortField={sortField} sortDir={sortDir} onClick={setSortFieldDir} />
              <Th label="Type"  field="et"    sortField={sortField} sortDir={sortDir} onClick={setSortFieldDir} />
              <Th label="Object" field="ot"   sortField={sortField} sortDir={sortDir} onClick={setSortFieldDir} />
              <Th label="Sort"  field="sort"  sortField={sortField} sortDir={sortDir} onClick={setSortFieldDir} />
              <Th label="Active" field="active" sortField={sortField} sortDir={sortDir} onClick={setSortFieldDir} />
              <th className="text-left px-3 py-2 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm">No rows.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-black/10 align-top">
                <td className="px-3 py-2">
                  <input
                    defaultValue={r.label}
                    onBlur={e=>{ const v=e.target.value.trim(); if (v!==r.label) updateRow(r,{label:v}); }}
                    className="w-full border border-transparent hover:border-black/10 rounded-lg px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <Select value={r.engagement_type_key}
                          onChange={(v)=>updateRow(r,{engagement_type_key:v})}
                          options={ets.map(et=>({value:et.key,label:et.label}))} />
                </td>
                <td className="px-3 py-2">
                  <Select value={r.object_type_key ?? ''}
                          onChange={(v)=>updateRow(r,{object_type_key: v===''? null : v})}
                          options={[{value:'',label:'Global (none)'}, ...ots.map(ot=>({value:ot.key,label:ot.label}))]} />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    defaultValue={r.sort ?? 0}
                    onBlur={e=>{ const v=Number(e.target.value||0); if (v!== (r.sort ?? 0)) updateRow(r,{sort:v}); }}
                    className="w-24 border border-transparent hover:border-black/10 rounded-lg px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={r.active} onChange={e=>updateRow(r,{active:e.target.checked})} />
                    <span>{r.active ? 'Yes' : 'No'}</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <button onClick={()=>deleteRow(r)} className="text-sm rounded-lg border border-black/10 px-2 py-1 hover:bg-black/5">
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

  function setSortFieldDir(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }
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

function Select({
  value, onChange, options
}: { value: string; onChange: (v:string)=>void; options: {value:string,label:string}[] }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="w-full border border-black/10 rounded-xl px-2 py-1 text-sm">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function labelPrefix(key: string, fallback: string) {
  switch (key) {
    case 'binary_attr':         return 'ISIT binary attributions on ';
    case 'scale_attr':          return 'ISIT scale attributions on ';
    case 'characteristic_attr': return 'Characteristics attributions on ';
    case 'multifaceted_attr':   return 'Multifaceted attributions on ';
    case 'like_dislike':        return 'Like/Dislike ';
    case 'comment':             return 'Comment on ';
    default:                    return fallback ? (fallback + ' ') : '';
  }
}
