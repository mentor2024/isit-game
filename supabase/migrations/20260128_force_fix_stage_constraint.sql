-- FORCE DROP any constraint that checks stage >= 1
DO $$
DECLARE
    con_name text;
BEGIN
    -- Find constraints on 'polls' table involving 'stage'
    FOR con_name IN
        SELECT conname
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' 
          AND conrelid = 'public.polls'::regclass
          AND pg_get_constraintdef(c.oid) LIKE '%stage%'
    LOOP
        -- Drop it
        EXECUTE 'ALTER TABLE public.polls DROP CONSTRAINT ' || quote_ident(con_name);
    END LOOP;
END $$;

-- Optional: Re-add a permissive constraint if you want validation (e.g. >= 0)
ALTER TABLE public.polls ADD CONSTRAINT polls_stage_check CHECK (stage >= 0);

-- Verify: Update a poll to stage 0 to confirm it works (Optional, you can do this in UI)
-- UPDATE polls SET stage = 0 WHERE title = 'Justification Disambiguator';
