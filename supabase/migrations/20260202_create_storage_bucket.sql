
-- Insert bucket if not exists
insert into storage.buckets (id, name, public)
values ('feedback_attachments', 'feedback_attachments', false)
on conflict (id) do nothing;

-- Values for RLS policies
-- We need to ensure we don't duplicate policies if this runs multiple times
-- But standard policies are:
-- 1. Insert: Authenticated users can upload
-- 2. Select: Service Role (Admin) only? Or user who uploaded?
--    The action uploads it, then saves the path. The User usually doesn't need to read it back immediately.
--    Admins need to read it. Service Role bypasses RLS.
--    So just Insert policy is critical.

create policy "Authenticated users can upload feedback attachments"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'feedback_attachments' );

-- Allow users to read their own uploads? Not strictly necessary for this feature but good practice?
-- Actually, let's keep it locked down. Only Service Role reads.
