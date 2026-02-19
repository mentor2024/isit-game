-- Insert the "4 Faces" Quad Grouping Poll

-- 1. Create the Poll
with new_poll as (
  insert into public.polls (
    title, 
    instructions, 
    stage, 
    level, 
    poll_order, 
    type,
    config
  ) values (
    'Awareness Test: The 4 Faces',
    'Separate these four people into two groups of two based on the characteristic you consider most important.',
    1, -- Adjust stage as needed, keeping it 1 for easy access
    2, -- Level 2 (or wherever appropriate)
    1, 
    'quad_sorting',
    '{
       "grouping_question": "Separate these four people into two groups of two.",
       "allow_submit_when_groups_full": true
     }'::jsonb
  ) returning id
)

-- 2. Insert the 4 Images as Poll Objects
insert into public.poll_objects (id, poll_id, text, image_url, attributes)
select 
  gen_random_uuid(),
  id,
  'Person 1',
  '/images/quad_demo/img1.png',
  '{"sort_id": 1}'::jsonb
from new_poll
union all
select 
  gen_random_uuid(),
  id,
  'Person 2',
  '/images/quad_demo/img2.png',
  '{"sort_id": 2}'::jsonb
from new_poll
union all
select 
  gen_random_uuid(),
  id,
  'Person 3',
  '/images/quad_demo/img3.png',
  '{"sort_id": 3}'::jsonb
from new_poll
union all
select 
  gen_random_uuid(),
  id,
  'Person 4',
  '/images/quad_demo/img4.png',
  '{"sort_id": 4}'::jsonb
from new_poll;
