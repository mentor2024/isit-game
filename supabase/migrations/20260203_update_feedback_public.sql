-- Force update the bucket to be public
update storage.buckets
set public = true
where id = 'feedback_attachments';
