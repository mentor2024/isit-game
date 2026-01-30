-- Update vote_isit to include scoring logic
-- Points = Poll Stage * Poll Level
-- Only awarded on the FIRST vote for a specific poll

create or replace function public.vote_isit(
  p_is_word_id text,
  p_it_word_id text,
  p_poll_id    uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_already_voted boolean;
  v_stage int;
  v_level int;
  v_points int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Check if user has already voted on this poll
  -- We check for ANY vote by this user on this poll
  select exists (
    select 1 from public.poll_votes 
    where poll_id = p_poll_id and user_id = v_uid
  ) into v_already_voted;

  -- 2. If first time voting, calculate and award points
  if not v_already_voted then
    -- Get stage and level
    select stage, level into v_stage, v_level
    from public.polls
    where id = p_poll_id;

    -- Default to 1 if null (though schema should probably enforce default, we handle safety here)
    v_stage := coalesce(v_stage, 1);
    v_level := coalesce(v_level, 1);
    
    -- Calculate points
    v_points := v_stage * v_level;

    -- Update Score
    update public.user_profiles
    set score = coalesce(score, 0) + v_points
    where id = v_uid;
  end if;


  -- 3. Perform the Voting Logic (Upsert)
  
  -- Basic validation: both objects belong to poll
  if not exists (select 1 from poll_objects where id = p_is_word_id and poll_id = p_poll_id) then
    raise exception 'IS word does not belong to poll';
  end if;
  if not exists (select 1 from poll_objects where id = p_it_word_id and poll_id = p_poll_id) then
    raise exception 'IT word does not belong to poll';
  end if;

  -- Upsert IS row
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side)
  values (p_poll_id, v_uid, p_is_word_id, 'IS')
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side;

  -- Upsert IT row
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side)
  values (p_poll_id, v_uid, p_it_word_id, 'IT')
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side;

end
$$;
