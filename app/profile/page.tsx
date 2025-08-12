'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  contact_email: string | null;
  phone: string | null;
  location: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  github: string | null;
  youtube: string | null;
  tiktok: string | null;
  bluesky: string | null;
  mastodon: string | null;
  facebook: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      setEmail(u.email ?? null);

      // ensure a row exists (ignore error result)
      await supabase.rpc('ensure_my_profile');

      const { data: row, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();

      if (error) setErr(error.message);
      else setP(row as any);
    })();
  }, []);

  const onSave = async () => {
    if (!userId || !p) return;
    setSaving(true); setErr(null); setOk(null);
    const { error } = await supabase.from('profiles').upsert({ ...p, id: userId });
    setSaving(false);
    if (error) setErr(error.message);
    else { setOk('Saved!'); setTimeout(()=>setOk(null), 1500); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setOk(null);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (upErr) { setErr(upErr.message); return; }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl;

    setP(prev => prev ? { ...prev, avatar_url: url, avatar_path: path } as any : prev);
  };

  if (!userId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm">
          You’re not signed in. <a href="/auth" className="underline">Sign in</a>.
        </div>
      </div>
    );
  }

  if (!p) return <div className="p-6">Loading…</div>;

  const Field = (props: any) => (
    <div>
      <label className="block text-xs text-black/60 mb-1">{props.label}</label>
      <input
        value={props.value || ''}
        onChange={(e)=>props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-lg border border-black/10 px-2 py-1"
      />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-semibold">Your Profile</h1>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}
      {ok &&  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{ok}</div>}

      {/* Avatar + basics */}
      <div className="rounded-2xl border border-black/10 p-4">
        <div className="flex items-center gap-4">
          <img
            src={p.avatar_url || '/images/logo_isit_game_100x800.png'}
            alt=""
            className="h-16 w-16 rounded-full object-cover border border-black/10"
          />
          <div>
            <label className="block text-xs text-black/60 mb-1">Upload new photo</label>
            <input type="file" accept="image/*" onChange={onFile} />
            {p.avatar_path && <div className="text-xs text-black/50 mt-1">Stored at: {p.avatar_path}</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <Field label="Full name" value={p.full_name} onChange={(v:any)=>setP({...p, full_name:v})} />
          <Field label="Username"  value={p.username}  onChange={(v:any)=>setP({...p, username:v})} />
          <Field label="Public email" value={p.contact_email} onChange={(v:any)=>setP({...p, contact_email:v})} />
        </div>

        <div className="mt-3">
          <label className="block text-xs text-black/60 mb-1">Bio</label>
          <textarea
            value={p.bio || ''}
            onChange={(e)=>setP({...p, bio: e.target.value})}
            className="w-full rounded-lg border border-black/10 px-2 py-1 h-28"
          />
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-2xl border border-black/10 p-4">
        <h2 className="font-medium mb-3">Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Phone"    value={p.phone}    onChange={(v:any)=>setP({...p, phone:v})} />
          <Field label="Location" value={p.location} onChange={(v:any)=>setP({...p, location:v})} />
          <Field label="Website"  value={p.website_url} onChange={(v:any)=>setP({...p, website_url:v})} />
          <Field label="Portfolio" value={p.portfolio_url} onChange={(v:any)=>setP({...p, portfolio_url:v})} />
        </div>
      </div>

      {/* Socials */}
      <div className="rounded-2xl border border-black/10 p-4">
        <h2 className="font-medium mb-3">Social</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Twitter / X" value={p.twitter} onChange={(v:any)=>setP({...p, twitter:v})} />
          <Field label="Instagram"   value={p.instagram} onChange={(v:any)=>setP({...p, instagram:v})} />
          <Field label="LinkedIn"    value={p.linkedin} onChange={(v:any)=>setP({...p, linkedin:v})} />
          <Field label="GitHub"      value={p.github} onChange={(v:any)=>setP({...p, github:v})} />
          <Field label="YouTube"     value={p.youtube} onChange={(v:any)=>setP({...p, youtube:v})} />
          <Field label="TikTok"      value={p.tiktok} onChange={(v:any)=>setP({...p, tiktok:v})} />
          <Field label="Bluesky"     value={p.bluesky} onChange={(v:any)=>setP({...p, bluesky:v})} />
          <Field label="Mastodon"    value={p.mastodon} onChange={(v:any)=>setP({...p, mastodon:v})} />
          <Field label="Facebook"    value={p.facebook} onChange={(v:any)=>setP({...p, facebook:v})} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-black text-white px-5 py-2 text-sm outline outline-1 outline-black outline-offset-[2px] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="text-xs text-black/50">
        Account email: {email ?? '—'}
      </div>
    </div>
  );
}
