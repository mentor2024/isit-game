import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock the submitVote logic (since we can't import server actions directly in script easily without Next setup)
async function simulateSubmitVote(pollId: string, userId: string) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`Simulating SubmitVote for Poll ${pollId} User ${userId}`);

    // 1. Fetch Poll Objects (to get IS/IT IDs)
    const { data: objects } = await supabase.from('poll_objects').select('id, correct_side').eq('poll_id', pollId);
    if (!objects || objects.length < 2) {
        console.error("Not enough objects");
        return;
    }

    const isObject = objects.find(o => o.correct_side === 'IS') || objects[0];
    const itObject = objects.find(o => o.correct_side === 'IT') || objects[1];

    console.log(`Voting IS: ${isObject.id}, IT: ${itObject.id}`);

    // 2. Call vote_isit RPC
    const { data: voteResult, error: voteError } = await supabase.rpc('vote_isit', {
        p_is_word_id: isObject.id,
        p_it_word_id: itObject.id,
        p_poll_id: pollId,
        // v_uid is auth.uid(), so we must Mock Auth or use Service Role with explicit user_id?
        // vote_isit uses auth.uid(). We can't easily mock auth.uid() in script without signing in.
    });

    // Strategy: Sign in as the user first
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: "test@example.com", // Wait, user is anon.
        password: "password"
    });
    // We can't sign in as anon easily in script.

    // ALTERNATIVE: Use Service Role to insert directly, bypassing RPC, 
    // BUT we want to test RPC or Actions.

    // Let's test checkLevelCompletion directly using Service Key.
    console.log("Testing checkLevelCompletion directly...");

    // We need the user ID from the wiped run (new one).
    // Let's fetch the most recent user from poll_votes (if they voted on others).
    // Or just create a dummy user.

    // Let's assume the user has ID '2ac6e9d6-1c28-4778-b514-edb0b75a65bb' (from prev logs).
    // Wait, that user had wiped votes.

    const targetUserId = '2ac6e9d6-1c28-4778-b514-edb0b75a65bb';

    // Mock checkLevelCompletion
    const { data: currentPoll } = await supabase.from('polls').select('stage, level').eq('id', pollId).single();
    console.log("Current Poll:", currentPoll);

    const { data: levelPolls } = await supabase.from('polls').select('id').eq('stage', currentPoll.stage).eq('level', currentPoll.level);
    const allLevelPollIds = levelPolls.map(p => p.id);
    console.log("Level Polls:", allLevelPollIds);

    // Simulate user votes (insert dummy votes for ALL polls in level)
    // We need to INSERT votes for this user to test completion.

    const dummyVotes = allLevelPollIds.map(pid => ({
        poll_id: pid,
        user_id: targetUserId,
        selected_object_id: isObject.id, // simplified
        chosen_side: 'IS',
        is_correct: true,
        points_earned: 0
    }));

    console.log("Inserting dummy votes...");
    const { error: upsertError } = await supabase.from('poll_votes').upsert(dummyVotes, { onConflict: 'user_id, poll_id, selected_object_id' }); // Conflict needs checking
    // Actually constraint is unique(user, poll, object).
    // Upserting might fail if object differs.
    // Let's clean up first?
    await supabase.from('poll_votes').delete().eq('user_id', targetUserId);

    await supabase.from('poll_votes').insert(dummyVotes);
    console.log("Votes inserted.");

    // NOW RUN THE LOGIC from checkLevelCompletion
    const { data: userVotes } = await supabase
        .from('poll_votes')
        .select('poll_id')
        .eq('user_id', targetUserId)
        .in('poll_id', allLevelPollIds);

    const userVotedPollIds = Array.from(new Set(userVotes?.map((v: any) => v.poll_id))) || [];
    console.log(`User Voted Polls: ${userVotedPollIds.length} / ${allLevelPollIds.length}`);

    const hasCompletedLevel = allLevelPollIds.every((id: string) => userVotedPollIds.includes(id));
    console.log("Has Completed Level:", hasCompletedLevel);

    if (hasCompletedLevel) {
        // Calculate Score Tier
        // ... (logic from actions.ts)
    }
}

// Use Poll 3 ID from logs
const POLL_3_ID = 'e3c3ad46-88e7-4d0d-8902-9ce1294c4e8c';
simulateSubmitVote(POLL_3_ID, 'dummy');
