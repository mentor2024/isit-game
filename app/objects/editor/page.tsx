'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
type Obj = {
  id: string;
  object_name: string;
  object_type: string;
  file_url: string | null;
  file_path: string | null;
  isit_quotient: number | null;
  metadata: any;
  created_by: string | null;
  created_at: string | null;
  _status?: 'idle'|'saving'|'saved'|'error';
  _dirty?: boolean;
  _selected?: boolean;
};

export default function ObjectsEditor() {
  const [rows, setRows] = useState<Obj[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [allowed, setAllowed] = useState<boolean|null>(null);

  // add form
  const [name, setName] = useState('');
  const [type, setType] = useState('word');
  const [url,  setUrl]  = useState('');
  const [path, setPath] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data: ok } = await supabase.rpc('has_power_current', { p_power: 'objects.read_all' });
      const { data: manage } = await supabase.rpc('has_power_current', { p_power: 'objects.manage' });
      setAllowed(Boolean(ok || manage));
      const t = await supabase.from('object_types').select('type').order('type');
      setTypes((t.data ?? []).map(x => x.type));
      await reload();
    })();
  }, []);

  async function reload() {
    setErr(null);
    const { data, error } = await supabase.from('objects').select('*').order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setRows((data ?? []).map((r:any)=>({ ...r, _status:'idle', _dirty:false, _selected:false })));
  }

  const filtered = rows.filter(r => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return [r.object_name, r.object_type, r.file_url ?? '', r.file_path ?? ''].some(v => String(v).toLowerCase().includes(n));
  });

  const mark = (id:string, s:Obj['_status']) => setRows(prev => prev.map(r => r.id===id?{...r,_status:s}:r));
  const patch = (id:string, p:Partial<Obj>) => setRows(prev => prev.map(r => r.id===id?{...r,...p,_dirty:true}:r));

  const save = async (r:Obj) => {
    try {
      mark(r.id,'saving'); setErr(null);
      // metadata: ensure valid JSON
      let meta:any = r.metadata;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta || '{}'); } catch { throw new Error('metadata must be valid JSON'); }
      }
      const { error } = await supabase.from('objects').update({
        object_name: r.object_name,
        object_type: r.object_type,
        file_url: r.file_url,
        file_path: r.file_path,
        isit_quotient: r.isit_quotient,
        metadata: meta
      }).eq('id', r.id);
      if (error) throw error;
      mark(r.id,'saved'); setTimeout(()=>mark(r.id,'idle'), 1000);
      patch(r.id, {_dirty:false});
    } catch(e:any) {
      setErr(e.message || String(e)); mark(r.id,'error'); setTimeout(()=>mark(r.id,'idle'), 2000);
    }
  };

  const removeSelected = async () => {
    const list = rows.filter(r=>r._selected).map(r=>r.id);
    if (!list.length) return;
    if (!confirm(`Delete ${list.length} object(s)?`)) return;
    const { error } = await supabase.from('objects').delete().in('id', list);
    if (error) { setErr(error.message); return; }
    await reload();
  };

  const add = async () => {
    if (!name.trim()) { alert('Name required'); return; }
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from('objects').insert({
      object_name: name.trim(),
      object_type: type,
      file_url: url || null,
      file_path: path || null,
      created_by: user.user?.id ?? null
    });
    if (error) { setErr(error.message); return; }
    setName(''); setUrl(''); setPath('');
    await reload();
  };

  if (allowed === false) return <div className="p-6 text-red-600">Access denied.</div>;
  if (allowed === null)  return <div className="p-6">Loading…</div>;

  const allChecked = filtered.length>0 && filtered.every(r=>r._selected);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      {/* Add */}
      <div className="rounded-2xl border border-black/10 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div><label className="block text-xs text-black/60 mb-1">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1" /></div>
          <div><label className="block text-xs text-black/60 mb-1">Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1">
              {types.map(t=><option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className="block text-xs text-black/60 mb-1">File URL</label>
            <input value={url} onChange={e=>setUrl(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1" /></div>
          <div><label className="block text-xs text-black/60 mb-1">File path</label>
            <input value={path} onChange={e=>setPath(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1" /></div>
          <div><button onClick={add} className="w-full rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">Add</button></div>
        </div>
      </div>

      {/* Search + bulk */}
      <div className="flex items-center justify-between gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…"
               className="rounded-xl border border-black/10 px-3 py-2 w-full md:w-96" />
        <button onClick={removeSelected} className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5">
          Delete selected
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3"><input type="checkbox" className="h-4 w-4"
                    checked={allChecked}
                    onChange={e=>{
                      const on = e.target.checked;
                      setRows(prev => prev.map(r => filtered.some(f=>f.id===r.id) ? { ...r, _selected:on } : r));
                    }} /></th>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">ISIT Q</th>
              <th className="p-3">File</th>
              <th className="p-3">Metadata (JSON)</th>
              <th className="p-3 w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-t border-black/5 align-top">
                <td className="p-3"><input type="checkbox" className="h-4 w-4" checked={!!r._selected}
                      onChange={e=>setRows(prev=>prev.map(x=>x.id===r.id?{...x,_selected:e.target.checked}:x))} /></td>
                <td className="p-3"><input value={r.object_name} onChange={e=>patch(r.id,{object_name:e.target.value})}
                      className="rounded-lg border border-black/10 px-2 py-1 w-48" /></td>
                <td className="p-3">
                  <select value={r.object_type} onChange={e=>patch(r.id,{object_type:e.target.value})}
                          className="rounded-lg border border-black/10 px-2 py-1">
                    {types.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="p-3"><input type="number" step="0.001" value={r.isit_quotient ?? ''} onChange={e=>patch(r.id,{isit_quotient: e.target.value === '' ? null : Number(e.target.value)})}
                      className="rounded-lg border border-black/10 px-2 py-1 w-24" /></td>
                <td className="p-3">
                  <div className="space-y-1">
                    <input placeholder="file_url" value={r.file_url ?? ''} onChange={e=>patch(r.id,{file_url:e.target.value || null})}
                           className="rounded-lg border border-black/10 px-2 py-1 w-60" />
                    <input placeholder="file_path" value={r.file_path ?? ''} onChange={e=>patch(r.id,{file_path:e.target.value || null})}
                           className="rounded-lg border border-black/10 px-2 py-1 w-60" />
                  </div>
                </td>
                <td className="p-3">
                  <textarea defaultValue={typeof r.metadata==='string'?r.metadata:JSON.stringify(r.metadata ?? {}, null, 2)}
                            onBlur={e=>patch(r.id,{metadata:e.target.value})}
                            className="rounded-lg border border-black/10 px-2 py-1 w-72 h-24 font-mono text-[12px]" />
                </td>
                <td className="p-3">
                  <button onClick={()=>save(r)} disabled={r._status==='saving' || !r._dirty}
                          className="rounded-xl bg-black text-white px-3 py-1.5 text-xs outline outline-1 outline-black outline-offset-[2px] disabled:opacity-50">
                    {r._status==='saving'?'Saving…':'Save'}
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-6 text-center text-black/50" colSpan={7}>No objects.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
