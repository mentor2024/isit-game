-- Rename text_isit to isit_text
update public.polls
set type = 'isit_text'
where type = 'text_isit';

-- Rename image_isit to isit_image
update public.polls
set type = 'isit_image'
where type = 'image_isit';

-- Update the default value for future inserts
alter table public.polls
alter column type set default 'isit_text';
