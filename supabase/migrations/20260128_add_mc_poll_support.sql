-- 1. Relax poll_votes constraints to support Multiple Choice (where there is no "side")
ALTER TABLE public.poll_votes ALTER COLUMN chosen_side DROP NOT NULL;

-- Remove the specific check constraint if it exists (handles both names from previous migrations)
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' 
      AND conrelid = 'public.poll_votes'::regclass
      AND pg_get_constraintdef(c.oid) LIKE '%chosen_side%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.poll_votes DROP CONSTRAINT ' || quote_ident(con_name);
    END IF;
END $$;

-- 2. Insert Poll 2: Justification Disambiguator
-- We assume it goes into Stage 0, Level 1 (A), Order 2
WITH new_poll AS (
    INSERT INTO public.polls (title, instructions, type, stage, level, poll_order)
    VALUES (
        'Justification Disambiguator', 
        'Which of the following best describes why that characteristic felt most important to you?', 
        'multiple_choice', 
        0, 
        1, 
        2
    )
    RETURNING id
)
INSERT INTO public.poll_objects (id, poll_id, text)
SELECT 
    'poll:' || id || ':opt' || idx,
    id,
    option_text
FROM new_poll, (
    VALUES 
        (1, 'It was the most visually or immediately noticeable difference.'),
        (2, 'It seemed like the clearest way to sort them into groups.'),
        (3, 'It reflected something about how the people appeared to be relating or expressing themselves.'),
        (4, 'It captured an underlying difference that felt more meaningful than surface traits.'),
        (5, 'I’m not entirely sure — it just felt like the right distinction.')
) AS options(idx, option_text);
