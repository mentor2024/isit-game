-- Remove any check constraints on stage that might enforce >= 1
-- We attempt to drop standard named constraints.
-- If the constraint has a random name, this might not catch it, but standard naming is polls_stage_check.

DO $$
DECLARE
    con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' 
      AND conrelid = 'public.polls'::regclass
      AND pg_get_constraintdef(c.oid) LIKE '%stage% >= 1%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.polls DROP CONSTRAINT ' || quote_ident(con_name);
    END IF;
END $$;

-- Also verify DEFAULT is handled (though application logic handles default 1 or 0)
ALTER TABLE public.polls ALTER COLUMN stage DROP DEFAULT;
