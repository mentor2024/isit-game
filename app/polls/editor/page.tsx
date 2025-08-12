'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from "@/lib/supabase";

type PollRow = {
  id: string;
  title: string | null;
  kind: string | null;                 // UI: "Poll Type"
  correct: 'IS' | 'IT' | null;
  poll_image_url: string | null;
  poll_image_path: string | null;      // NEW: storage key
  stage: number | null;
  level: string | null;                // 'A'...'E'
  mirror: boolean | null;
  _dirty?: boolean;                    // local unsaved edits
  _file?: File | null;                 // pending image
  _selected?: boolean;                 // for submit buttons / bulk
};

const POLL_TYPES = ['isit','binary','survey','other'] as const;
const LEVELS = ['A','B','C','D','E'] as const;

type SortKey = 'title'|'stage'|'level'|'mirror'|'kind'|'correct'|'poll_image_url';
type SortDir = 'asc'|'desc';

export default function PollsEditorPage() {
  const [rows, setRows] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // per-row status hints
  const [rowStatus, setRowStatus] = useState<Record<string, 'idle'|'saving'|'saved'|'error'>>({});

  // Filters
  const [fTitle, setFTitle] = useState('');
  const [fStage, setFStage] = useState<string>('');
  const [fLevel, setFLevel] = useState<string>('');
  const [fMirror, setFMirror] = useState<string>(''); // ''|'true'|'false'
  const [fKind, setFKind] = useState<string>('');
  const [fCorrect, setFCorrect] = useState<string>(''); // ''|'IS'|'IT'
  const [fHasImage, setFHasImage] = useState<string>(''); // ''|'has'|'none'

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('stage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErrorMsg(null);
      const { data, error } = await supabase.from('poll_meta').select('*').limit(2000);
      if (error) setErrorMsg(error.message);
      setRows((data ?? []).map((r: any) => ({ ...r, _dirty: false, _file: null, _selected: false })));
      setLoading(false);
    };
    load();
  }, []);

  // Unique values for filters
  const uniqueStages = useMemo(
    () => Array.from(new Set(rows.map(r => r.stage).filter((v): v is number => v !== null))).sort((a,b)=>a-b),
    [rows]
  );
  const uniqueKinds = useMemo(
    () => Array.from(new Set(rows.map(r => r.kind || ''))).filter(Boolean).sort(),
    [rows]
  );

  // Filtering
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (fTitle && !(r.title ?? '').toLowerCase().includes(fTitle.toLowerCase())) return false;
      if (fStage && String(r.stage ?? '') !== fStage) return false;
      if (fLevel && (r.level ?? '') !== fLevel) return false;
      if (fMirror && String(!!r.mirror) !== fMirror) return false;
      if (fKind && (r.kind ?? '') !== fKind) return false;
      if (fCorrect && (r.correct ?? '') !== fCorrect) return false;
      if (fHasImage === 'has' && !r.poll_image_url) return false;
      if (fHasImage === 'none' && !!r.poll_image_url) return false;
      return true;
    });
  }, [rows, fTitle, fStage, fLevel, fMirror, fKind, fCorrect, fHasImage]);

  // Sorting
  const sortedRows = useMemo(() => {
    const safe = (v: any) => (v === null || v === undefined ? '' : v);
    const dir = sortDir === 'asc' ? 1 : -1;
    return filteredRows.slice().sort((a,b) => {
      if (sortKey === 'stage') {
        const an = a.stage ?? Number.MAX_SAFE_INTEGER, bn = b.stage ?? Number.MAX_SAFE_INTEGER;
        return (an - bn) * dir;
      }
      if (sortKey === 'mirror') {
        const an = a.mirror ? 1 : 0, bn = b.mirror ? 1 : 0;
        return (an - bn) * dir;
      }
      if (sortKey === 'poll_image_url') {
        const an = a.poll_image_url ? 1 : 0, bn = b.poll_image_url ? 1 : 0;
        if (an !== bn) return (an - bn) * dir;
      }
      const av = String(safe((a as any)[sortKey]));
      const bv = String(safe((b as any)[sortKey]));
      return av.localeCompare(bv) * dir;
    });
  }, [filteredRows, sortKey, sortDir]);

  // Selection helpers
  const allVisibleChecked = sortedRows.length > 0 && sortedRows.every(r => r._selected);
  const selectedRows = useMemo(() => rows.filter(r => r._selected), [rows]);
  const selectedCount = selectedRows.length;

  const toggleAllVisible = (checked: boolean) => {
    setRows(prev => prev.map(r => sortedRows.some(v => v.id === r.id) ? { ...r, _selected: checked } : r));
  };

  // Status helpers
  const markRowStatus = (id: string, s: 'idle'|'saving'|'saved'|'error') =>
    setRowStatus(prev => ({ ...prev, [id]: s }));

  // Update a single field locally
  const updateField = <K extends keyof PollRow>(id: string, key: K, value: PollRow[K]) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [key]: value, _dirty: true } : r)));
  };

  // Storage upload returns both path + public URL
  const uploadToStorage = async (id: string, file: File) => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('poll-images').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('poll-images').getPublicUrl(path);
    return { path, publicUrl: pub.publicUrl as string };
  };

  // Patch save (auto-save fields)
  const savePatch = async (id: string, patch: Partial<Pick<PollRow,'stage'|'level'|'mirror'|'kind'|'correct'|'poll_image_url'|'poll_image_path'>>) => {
    setErrorMsg(null);
    markRowStatus(id, 'saving');
    try {
      const { error: rpcErr } = await supabase.rpc('update_poll_meta', {
        p_poll_id: id,
        p_stage: patch.stage ?? null,
        p_level: patch.level ?? null,
        p_mirror: patch.mirror ?? null,
        p_kind: patch.kind ?? null,
        p_correct: patch.correct ?? null,
        p_poll_image_url: patch.poll_image_url ?? null,
        p_poll_image_path: patch.poll_image_path ?? null,
      });
      if (rpcErr) throw rpcErr;
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch, _dirty: false } : r));
      markRowStatus(id, 'saved');
      setTimeout(() => markRowStatus(id, 'idle'), 1200);
    } catch (e: any) {
      markRowStatus(id, 'error');
      setErrorMsg(e?.message || String(e));
    }
  };

  // Full row save (manual submit or bulk)
  const saveRow = async (r: PollRow) => {
    markRowStatus(r.id, 'saving');
    try {
      let imageUrl = r.poll_image_url ?? null;
      let imagePath = r.poll_image_path ?? null;
      if (r._file) {
        const up = await uploadToStorage(r.id, r._file);
        imageUrl = up.publicUrl;
        imagePath = up.path;
      }
      const { error: rpcErr } = await supabase.rpc('update_poll_meta', {
        p_poll_id: r.id,
        p_stage: r.stage ?? null,
        p_level: r.level ?? null,
        p_mirror: r.mirror ?? null,
        p_kind: r.kind ?? null,
        p_correct: r.correct ?? null,
        p_poll_image_url: imageUrl,
        p_poll_image_path: imagePath,
      });
      if (rpcErr) throw rpcErr;
      setRows(prev => prev.map(x => x.id === r.id ? { ...x, poll_image_url: imageUrl, poll_image_path: imagePath, _dirty: false, _file: null } : x));
      markRowStatus(r.id, 'saved');
      setTimeout(() => markRowStatus(r.id, 'idle'), 1200);
    } catch (e: any) {
      markRowStatus(r.id, 'error');
      setErrorMsg(e?.message || String(e));
    }
  };

  // Submit all selected rows with edits/files
  const submitSelected = async () => {
    for (const r of selectedRows) {
      if (r._dirty || r._file) {
        // eslint-disable-next-line no-await-in-loop
        await saveRow(r);
      }
    }
  };

  // Propagate values to selected rows (auto-save or manual)
  const propagateToSelected = async <K extends keyof PollRow>(
    key: K,
    value: PollRow[K],
    options: { autosave?: boolean } = {}
  ) => {
    const targets = rows.filter(r => r._selected);
    if (targets.length <= 1) return; // nothing to propagate

    if (options.autosave) {
      setRows(prev => prev.map(r => r._selected ? { ...r, [key]: value, _dirty: false } : r));
      await Promise.allSettled(targets.map(async r => {
        await savePatch(r.id, { [key]: value } as any);
      }));
    } else {
      setRows(prev => prev.map(r => r._selected ? { ...r, [key]: value, _dirty: true } : r));
    }
  };

  const onHeaderClick = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-[10px] text-black/50">
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  );

  if (loading) return <div className="p-6">Loading polls…</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Filters */}
      <Filters
        rows={rows}
        sortedCount={sortedRows.length}
        totalCount={rows.length}
        uniqueStages={uniqueStages}
        uniqueKinds={uniqueKinds}
        fTitle={fTitle} setFTitle={setFTitle}
        fStage={fStage} setFStage={setFStage}
        fLevel={fLevel} setFLevel={setFLevel}
        fMirror={fMirror} setFMirror={setFMirror}
        fKind={fKind} setFKind={setFKind}
        fCorrect={fCorrect} setFCorrect={setFCorrect}
        fHasImage={fHasImage} setFHasImage={setFHasImage}
      />

      {/* Bulk submit toolbar (only if any rows selected) */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input type="checkbox" className="h-4 w-4"
                   checked={allVisibleChecked}
                   onChange={(e)=>toggleAllVisible(e.target.checked)} />
            <span className="text-sm text-black/70">Select all visible ({sortedRows.filter(r=>r._selected).length} / {sortedRows.length})</span>
          </div>
          <button
            onClick={submitSelected}
            className="rounded-xl bg-black text-white px-3 py-2 text-sm outline outline-1 outline-black outline-offset-[2px]"
          >
            Submit selected changes
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-black/5">
              <th className="p-3">
                <input type="checkbox" className="h-4 w-4"
                  checked={allVisibleChecked}
                  onChange={(e)=>toggleAllVisible(e.target.checked)} />
              </th>
              <SortableTh label="Title" k="title" onClick={onHeaderClick} SortIcon={SortIcon} />
              <SortableTh label="Stage" k="stage" onClick={onHeaderClick} SortIcon={SortIcon} />
              <SortableTh label="Level" k="level" onClick={onHeaderClick} SortIcon={SortIcon} />
              <SortableTh label="Mirror" k="mirror" onClick={onHeaderClick} SortIcon={SortIcon} />
              <SortableTh label="Poll Type" k="kind" onClick={onHeaderClick} SortIcon={SortIcon} />
              <SortableTh label="Correct" k="correct" onClick={onHeaderClick} SortIcon={SortIcon} />
              <SortableTh label="Poll Image" k="poll_image_url" onClick={onHeaderClick} SortIcon={SortIcon} />
              <th className="p-3 w-[18rem]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(r => {
              const status = rowStatus[r.id] || 'idle';
              return (
                <tr key={r.id} className="border-top border-black/5 align-top">
                  {/* Select */}
                  <td className="p-3">
                    <input type="checkbox" className="h-4 w-4"
                      checked={!!r._selected}
                      onChange={(e)=>setRows(prev => prev.map(x => x.id===r.id ? { ...x, _selected: e.target.checked } : x))}
                    />
                  </td>

                  {/* Title */}
                  <td className="p-3">
                    <div className="text-[13px] font-semibold">{r.title ?? '(untitled)'}</div>
                    <div className="text-[11px] text-black/50">{r.id.slice(0,8)}…</div>
                  </td>

                  {/* Stage (manual; propagate if many selected) */}
                  <td className="p-3">
                    <input
                      type="number" min={0}
                      value={r.stage ?? ''}
                      onChange={(e)=>{
                        const val = e.target.value===''? null : Number(e.target.value);
                        updateField(r.id, 'stage', val);
                        if (selectedCount >= 2) { void propagateToSelected('stage', val, { autosave: false }); }
                      }}
                      className="w-20 rounded-lg border border-black/10 px-2 py-1"
                    />
                  </td>

                  {/* Level (auto-save; propagate to all selected) */}
                  <td className="p-3">
                    <select
                      value={r.level ?? ''}
                      onChange={async (e) => {
                        const val = e.target.value || null;
                        updateField(r.id, 'level', val);
                        if (selectedCount >= 2) {
                          await propagateToSelected('level', val, { autosave: true });
                        } else {
                          await savePatch(r.id, { level: val });
                        }
                      }}
                      className="rounded-lg border border-black/10 px-2 py-1"
                    >
                      <option value="">-</option>
                      {LEVELS.map(L => <option key={L} value={L}>{L}</option>)}
                    </select>
                  </td>

                  {/* Mirror (manual; propagate if many selected) */}
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={!!r.mirror}
                      onChange={(e)=>{
                        const val = e.target.checked;
                        updateField(r.id, 'mirror', val);
                        if (selectedCount >= 2) { void propagateToSelected('mirror', val, { autosave: false }); }
                      }}
                    />
                  </td>

                  {/* Poll Type (auto-save; propagate) */}
                  <td className="p-3">
                    <select
                      value={r.kind ?? ''}
                      onChange={async (e) => {
                        const val = e.target.value || null;
                        updateField(r.id, 'kind', val);
                        if (selectedCount >= 2) {
                          await propagateToSelected('kind', val, { autosave: true });
                        } else {
                          await savePatch(r.id, { kind: val as any });
                        }
                      }}
                      className="rounded-lg border border-black/10 px-2 py-1"
                    >
                      {[...new Set([...uniqueKinds, ...POLL_TYPES])].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>

                  {/* Correct (auto-save; propagate) */}
                  <td className="p-3">
                    <select
                      value={r.correct ?? ''}
                      onChange={async (e) => {
                        const val = (e.target.value || null) as 'IS'|'IT'|null;
                        updateField(r.id, 'correct', val);
                        if (selectedCount >= 2) {
                          await propagateToSelected('correct', val, { autosave: true });
                        } else {
                          await savePatch(r.id, { correct: val as any });
                        }
                      }}
                      className="rounded-lg border border-black/10 px-2 py-1"
                    >
                      <option value="">-</option>
                      <option value="IS">IS</option>
                      <option value="IT">IT</option>
                    </select>
                  </td>

                  {/* Poll Image (Upload now saves URL+PATH immediately; no checkbox needed) */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {r.poll_image_url
                        ? <img src={r.poll_image_url} alt="poll image" width={48} height={48}
                               className="rounded-md object-cover border border-black/10" />
                        : <div className="h-12 w-12 rounded-md border border-dashed border-black/20 grid place-items-center text-[10px] text-black/40">no image</div>}
                      <div className="flex flex-col gap-1">
                        <input
                          type="file" accept="image/*"
                          onChange={(e)=>updateField(r.id, '_file' as any, (e.target.files?.[0] ?? null) as any)} />
                        <div className="flex items-center gap-2">
                          {r._file && <span className="text-[11px] text-black/60">queued: {r._file.name}</span>}
                          <button
                            onClick={async ()=>{
                              if (!r._file) return;
                              markRowStatus(r.id, 'saving');
                              try {
                                const up = await uploadToStorage(r.id, r._file);
                                await savePatch(r.id, { poll_image_url: up.publicUrl, poll_image_path: up.path });
                                setRows(prev => prev.map(x => x.id===r.id ? { ...x, _file: null } : x));
                              } catch (e: any) {
                                markRowStatus(r.id, 'error');
                                setErrorMsg(e?.message || String(e));
                              }
                            }}
                            disabled={!r._file || rowStatus[r.id]==='saving'}
                            className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 disabled:opacity-50"
                          >
                            Upload
                          </button>
                        </div>
                        {r.poll_image_path && (
                          <span className="text-[10px] text-black/40 break-all">path: {r.poll_image_path}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Actions: per-row submit shows only when row is selected (for manual fields) */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {r._selected && (
                        <button
                          onClick={()=>saveRow(r)}
                          disabled={rowStatus[r.id]==='saving' || (!r._dirty && !r._file)}
                          className="rounded-xl bg-black text-white px-3 py-1.5 text-xs outline outline-1 outline-black outline-offset-[2px] disabled:opacity-50"
                        >
                          {rowStatus[r.id]==='saving' ? 'Saving…' : 'Submit'}
                        </button>
                      )}
                      {rowStatus[r.id]==='saved' && <span className="text-[11px] text-green-600">Saved</span>}
                      {rowStatus[r.id]==='error' && <span className="text-[11px] text-red-600">Error</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!sortedRows.length && (
              <tr><td className="p-6 text-center text-black/50" colSpan={9}>No polls match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== UI helpers (filters + headers) ===== */

function Filters(props: {
  rows: any[];
  sortedCount: number;
  totalCount: number;
  uniqueStages: number[];
  uniqueKinds: string[];
  fTitle: string; setFTitle: (v: string)=>void;
  fStage: string; setFStage: (v: string)=>void;
  fLevel: string; setFLevel: (v: string)=>void;
  fMirror: string; setFMirror: (v: string)=>void;
  fKind: string; setFKind: (v: string)=>void;
  fCorrect: string; setFCorrect: (v: string)=>void;
  fHasImage: string; setFHasImage: (v: string)=>void;
}) {
  const LEVELS = ['A','B','C','D','E'];
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        <div>
          <label className="block text-xs text-black/60 mb-1">Title</label>
          <input value={props.fTitle} onChange={(e)=>props.setFTitle(e.target.value)} placeholder="search…"
                 className="w-full rounded-lg border border-black/10 px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs text-black/60 mb-1">Stage</label>
          <select value={props.fStage} onChange={(e)=>props.setFStage(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-2 py-1">
            <option value="">(any)</option>
            {props.uniqueStages.map(s => <option key={s} value={String(s)}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-black/60 mb-1">Level</label>
          <select value={props.fLevel} onChange={(e)=>props.setFLevel(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-2 py-1">
            <option value="">(any)</option>
            {LEVELS.map(L => <option key={L} value={L}>{L}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-black/60 mb-1">Mirror</label>
          <select value={props.fMirror} onChange={(e)=>props.setFMirror(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-2 py-1">
            <option value="">(any)</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-black/60 mb-1">Poll Type</label>
          <select value={props.fKind} onChange={(e)=>props.setFKind(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-2 py-1">
            <option value="">(any)</option>
            {[...new Set([...props.uniqueKinds, 'isit','binary','survey','other'])].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-black/60 mb-1">Correct</label>
          <select value={props.fCorrect} onChange={(e)=>props.setFCorrect(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-2 py-1">
            <option value="">(any)</option>
            <option value="IS">IS</option>
            <option value="IT">IT</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-black/60 mb-1">Poll Image</label>
          <select value={props.fHasImage} onChange={(e)=>props.setFHasImage(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-2 py-1">
            <option value="">(any)</option>
            <option value="has">has image</option>
            <option value="none">no image</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-black/60">{props.sortedCount} of {props.totalCount} visible</div>
        <button
          className="rounded-xl border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
          onClick={() => { props.setFTitle(''); props.setFStage(''); props.setFLevel(''); props.setFMirror(''); props.setFKind(''); props.setFCorrect(''); props.setFHasImage(''); }}
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

type SortKey = 'title'|'stage'|'level'|'mirror'|'kind'|'correct'|'poll_image_url';
type SortDir = 'asc'|'desc';

function SortableTh({
  label, k, onClick, SortIcon
}: {
  label: string;
  k: SortKey;
  onClick: (k: SortKey) => void;
  SortIcon: React.FC<{ k: SortKey }>;
}) {
  return (
    <th className="p-3 select-none">
      <button
        type="button"
        onClick={()=>onClick(k)}
        className="inline-flex items-center gap-1 hover:underline"
        title="Sort"
      >
        <span>{label}</span>
        <SortIcon k={k} />
      </button>
    </th>
  );
}
