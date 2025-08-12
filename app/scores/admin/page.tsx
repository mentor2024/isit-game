'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Fn = { function_key: string; label: string; description: string|null; param_schema: any; created_at: string };
type Rule = { id: string; function_key: string; active: boolean; base_points: number; factor_param: string|null; factor_map: any; note: string|null; created_at: string };

export default function ScoresAdmin() {
  const [allowed, setAllowed] = useState<boolean|null>(null);
  const [err, setErr] = useState<string|null>(null);

  const [fns, setFns] = useState<Fn[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('has_power_current', { p_power: 'scores.manage' });
      setAllowed(Boolean(data));
      if (data) await reload();
    })();
  }, []);

  async function reload() {
    setErr(null);
    const [a,b] = await Promise.all([
      supabase.from('score_functions').select('*').order('function_key'),
      supabase.from('score_rules').select('*').order('created_at', { ascending: false })
    ]);
    if (a.error) setErr(a.error.message);
    if (b.error) setErr(b.error.message);
    setFns((a.data ?? []).map((x:any)=>({ ...x, param_schema: x.param_schema ?? null })));
    setRules((b.data ?? []).map((x:any)=>({ ...x, factor_map: x.factor_map ?? null })));
  }

  const addFunction = async () => {
    if (!newKey.trim() || !newLabel.trim()) { alert('function_key and label required'); return; }
    const { error } = await supabase.from('score_functions').insert({
      function_key: newKey.trim(),
      label: newLabel.trim()
    });
    if (error) { setErr(error.message); return; }
    setNewKey(''); setNewLabel(''); await reload();
  };

  const saveRule = async (r: Rule) => {
    try {
      // ensure factor_map JSON
      let fmap:any = r.factor_map;
      if (typeof fmap === 'string' && fmap.length) {
        try { fmap = JSON.parse(fmap); } catch { throw new Error('factor_map must be valid JSON'); }
      } else if (fmap === '') fmap = null;
      const { error } = await supabase.from('score_rules').update({
        function_key: r.function_key,
        active: r.active,
        base_points: r.base_points,
        factor_param: r.factor_param,
        factor_map: fmap,
        note: r.note
      }).eq('id', r.id);
      if (error) throw error;
    } catch(e:any) { setErr(e.message || String(e)); }
  };

  if (allowed === false) return <div className="p-6 text-red-600">Access denied.</div>;
  if (allowed === null) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

      {/* Add function */}
      <div className="rounded-2xl border border-black/10 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-black/60 mb-1">function_key</label>
            <input value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="e.g. polls.vote"
                   className="w-full rounded-lg border border-black/10 px-2 py-1"/>
          </div>
          <div>
            <label className="block text-xs text-black/60 mb-1">label</label>
            <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="human label"
                   className="w-full rounded-lg border border-black/10 px-2 py-1"/>
          </div>
          <div>
            <button onClick={addFunction} className="w-full rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]">
              Add function
            </button>
          </div>
        </div>
      </div>

      {/* Functions */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Functions</h2>
        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-black/5 text-left">
              <th className="p-3">function_key</th><th className="p-3">label</th><th className="p-3">description</th>
            </tr></thead>
            <tbody>
              {fns.map(f=>(
                <tr key={f.function_key} className="border-t border-black/5">
                  <td className="p-3 font-mono">{f.function_key}</td>
                  <td className="p-3">{f.label}</td>
                  <td className="p-3">{f.description ?? '—'}</td>
                </tr>
              ))}
              {!fns.length && <tr><td className="p-6 text-center text-black/50" colSpan={3}>No functions.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rules */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Rules</h2>
        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-black/5 text-left">
              <th className="p-3">function_key</th>
              <th className="p-3">active</th>
              <th className="p-3">base_points</th>
              <th className="p-3">factor_param</th>
              <th className="p-3">factor_map (JSON)</th>
              <th className="p-3">note</th>
              <th className="p-3 w-28">Actions</th>
            </tr></thead>
            <tbody>
              {rules.map(r=>(
                <tr key={r.id} className="border-t border-black/5 align-top">
                  <td className="p-3">
                    <select value={r.function_key}
                      onChange={e=>setRules(prev=>prev.map(x=>x.id===r.id?{...x,function_key:e.target.value}:x))}
                      className="rounded-lg border border-black/10 px-2 py-1">
                      {fns.map(f=><option key={f.function_key} value={f.function_key}>{f.function_key}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><input type="checkbox" checked={r.active}
                        onChange={e=>setRules(prev=>prev.map(x=>x.id===r.id?{...x,active:e.target.checked}:x))} /></td>
                  <td className="p-3"><input type="number" value={r.base_points}
                        onChange={e=>setRules(prev=>prev.map(x=>x.id===r.id?{...x,base_points:Number(e.target.value)}:x))}
                        className="w-24 rounded-lg border border-black/10 px-2 py-1"/></td>
                  <td className="p-3"><input value={r.factor_param ?? ''} onChange={e=>setRules(prev=>prev.map(x=>x.id===r.id?{...x,factor_param:e.target.value||null}:x))}
                        className="w-28 rounded-lg border border-black/10 px-2 py-1"/></td>
                  <td className="p-3">
                    <textarea defaultValue={typeof r.factor_map==='string'?r.factor_map:JSON.stringify(r.factor_map ?? {}, null, 2)}
                              onBlur={e=>setRules(prev=>prev.map(x=>x.id===r.id?{...x,factor_map:e.target.value}:x))}
                              className="w-72 h-24 rounded-lg border border-black/10 px-2 py-1 font-mono text-[12px]" />
                  </td>
                  <td className="p-3"><input value={r.note ?? ''} onChange={e=>setRules(prev=>prev.map(x=>x.id===r.id?{...x,note:e.target.value||null}:x))}
                        className="w-48 rounded-lg border border-black/10 px-2 py-1"/></td>
                  <td className="p-3">
                    <button onClick={()=>saveRule(r)}
                            className="rounded-xl bg-black text-white px-3 py-1.5 text-xs outline outline-1 outline-black outline-offset-[2px]">
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {!rules.length && <tr><td className="p-6 text-center text-black/50" colSpan={7}>No rules.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
