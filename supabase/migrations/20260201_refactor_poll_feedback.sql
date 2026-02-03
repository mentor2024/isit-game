-- Rename instructions_correct to feedback_correct
ALTER TABLE polls
RENAME COLUMN instructions_correct TO feedback_correct;

-- Rename instructions_incorrect to feedback_incorrect
ALTER TABLE polls
RENAME COLUMN instructions_incorrect TO feedback_incorrect;
