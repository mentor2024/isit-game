-- Create the storage bucket for feedback attachments if it doesn't exist
insert into storage.buckets (id, name, public)
values ('feedback_attachments', 'feedback_attachments', true)
on conflict (id) do nothing;

-- Set up RLS for the storage bucket
create policy "Feedback Attachments Public Access"
    on storage.objects for select
    using ( bucket_id = 'feedback_attachments' );

-- Allow authenticated users to upload
create policy "Authenticated Users can upload feedback"
    on storage.objects for insert
    to authenticated
    with check ( bucket_id = 'feedback_attachments' );

-- Allow anonymous users to upload
create policy "Anon Users can upload feedback"
    on storage.objects for insert
    to anon
    with check ( bucket_id = 'feedback_attachments' );
