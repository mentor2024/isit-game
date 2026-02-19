-- Ensure each user can only have ONE vote per poll (prevents multi-vote accumulation)
ALTER TABLE poll_votes
DROP CONSTRAINT IF EXISTS poll_votes_user_id_poll_id_key; -- specific name guess
ALTER TABLE poll_votes
DROP CONSTRAINT IF EXISTS poll_votes_user_id_poll_id_selected_object_id_key; -- specific name guess

-- Add strict constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique_user_poll 
ON poll_votes (user_id, poll_id);

ALTER TABLE poll_votes
ADD CONSTRAINT unique_user_vote_per_poll UNIQUE USING INDEX idx_poll_votes_unique_user_poll;
