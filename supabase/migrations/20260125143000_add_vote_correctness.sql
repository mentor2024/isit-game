-- Add is_correct column to poll_votes
alter table public.poll_votes 
add column if not exists is_correct boolean default false;

-- RPC: Update vote_isit to calculate and store correctness
create or replace function public.vote_isit(
  p_is_word_id text,
  p_it_word_id text,
  p_poll_id    uuid
) returns json -- Changed return type to return detailed info (optional, or keep void)
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_is_correct boolean;
  v_it_correct boolean;
  v_is_side text;
  v_it_side text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Validate and Fetch Correct Sides
  select correct_side into v_is_side from poll_objects where id = p_is_word_id and poll_id = p_poll_id;
  select correct_side into v_it_side from poll_objects where id = p_it_word_id and poll_id = p_poll_id;

  if v_is_side is null or v_it_side is null then
     -- Fallback if validation fails or correct_side not set (old polls)
     -- We can default to false or try to proceed.
     -- Let's assume validation passed if IDs exist.
     if not exists (select 1 from poll_objects where id = p_is_word_id and poll_id = p_poll_id) then
        raise exception 'IS word does not belong to poll';
     end if;
     if not exists (select 1 from poll_objects where id = p_it_word_id and poll_id = p_poll_id) then
        raise exception 'IT word does not belong to poll';
     end if;
  end if;

  -- 2. Determine Correctness
  -- Use dragged p_is_word_id to 'IS'. Is it correct?
  v_is_correct := (v_is_side = 'IS');
  
  -- User dragged p_it_word_id to 'IT'. Is it correct?
  v_it_correct := (v_it_side = 'IT');

  -- Upsert IS row
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side, is_correct)
  values (p_poll_id, v_uid, p_is_word_id, 'IS', v_is_correct)
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side, is_correct = excluded.is_correct;

  -- Upsert IT row
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side, is_correct)
  values (p_poll_id, v_uid, p_it_word_id, 'IT', v_it_correct)
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side, is_correct = excluded.is_correct;
  
  -- Return result (Composite correctness: both must be correct?)
  -- Usually "Correct" means both are placed correctly.
  return json_build_object(
    'correct', (v_is_correct and v_it_correct),
    'has_answer', (v_is_side is not null and v_it_side is not null)
  );
end
$$;

-- Backfill existing votes (Best effort)
update public.poll_votes v
set is_correct = (v.chosen_side = o.correct_side)
from public.poll_objects o
where v.selected_object_id = o.id
and v.is_correct is null;
