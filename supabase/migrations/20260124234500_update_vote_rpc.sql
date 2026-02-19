-- Update vote_isit to return validation result
-- Returns JSON: { "correct": boolean, "has_answer": boolean }

create or replace function public.vote_isit(
  p_is_word_id text,
  p_it_word_id text,
  p_poll_id    uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_is_obj public.poll_objects%rowtype;
  v_it_obj public.poll_objects%rowtype;
  v_correct boolean := null;
  v_has_answer boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Fetch objects to validate existence AND check answers
  select * into v_is_obj from poll_objects where id = p_is_word_id and poll_id = p_poll_id;
  if not found then raise exception 'IS word does not belong to poll'; end if;

  select * into v_it_obj from poll_objects where id = p_it_word_id and poll_id = p_poll_id;
  if not found then raise exception 'IT word does not belong to poll'; end if;

  -- Logic:
  -- If both objects have non-null correct_side, we can validate.
  -- If either is null, we can't strictly validate correctness (return has_answer=false).
  
  if v_is_obj.correct_side is not null and v_it_obj.correct_side is not null then
    v_has_answer := true;
    -- It is correct if the User assigned 'IS' to the object that expects 'IS'
    -- AND 'IT' to the object that expects 'IT'.
    if v_is_obj.correct_side = 'IS' and v_it_obj.correct_side = 'IT' then
        v_correct := true;
    else
        v_correct := false;
    end if;
  end if;

  -- Upsert IS vote
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side)
  values (p_poll_id, v_uid, p_is_word_id, 'IS')
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side;

  -- Upsert IT vote
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side)
  values (p_poll_id, v_uid, p_it_word_id, 'IT')
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side;

  return jsonb_build_object(
    'correct', v_correct,
    'has_answer', v_has_answer
  );
end
$$;
