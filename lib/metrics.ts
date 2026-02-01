import { SupabaseClient } from "@supabase/supabase-js";

export type UserMetrics = {
    pollsTaken: number;
    pollsIncorrect: number;
    overallDq: number;
    rawScore: number;
    aq: number;
};

export async function getUserMetrics(supabase: SupabaseClient, userId: string): Promise<UserMetrics> {
    // 1. Get raw score from profile
    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('score')
        .eq('id', userId)
        .single();

    if (error) {
        console.error(`[getUserMetrics] Error fetching profile for ${userId}:`, error);
    } else {
        console.log(`[getUserMetrics] Fetched score for ${userId}:`, profile?.score);
    }

    const rawScore = profile?.score || 0;

    // 2. Get Poll Statistics
    // We need "Total Polls Taken" and "Polls where at least one vote was wrong".
    // Efficient way:
    // Fetch all votes for user, select poll_id, is_correct
    // Then process in JS (simpler than complex SQL if dataset isn't huge yet)
    // Or doing a count?
    // Let's do a grouped query if possible, or just select needed fields.
    // Since we need to know "Is ANY vote for this poll incorrect?", grouped by poll_id.

    const { data: votes } = await supabase
        .from('poll_votes')
        .select('poll_id, is_correct, points_earned, polls(stage)')
        .eq('user_id', userId);

    const pollMap = new Map<string, boolean>(); // poll_id -> is_fully_correct
    let stageZeroPoints = 0;

    if (votes) {
        votes.forEach(v => {
            // AQ Calculation: Sum points earned in Stage 0
            // @ts-ignore - Supabase type inference for joined tables can be tricky
            if (v.polls?.stage === 0) {
                stageZeroPoints += (v.points_earned || 0);
            }

            const currentStatus = pollMap.get(v.poll_id);
            // If we haven't seen this poll, assume true (innocent until proven guilty)
            // But wait, v.is_correct is for a side. 
            // If v.is_correct is false, the POLL is incorrect.
            // If v.is_correct is true, we keep checking.

            if (currentStatus === undefined) {
                pollMap.set(v.poll_id, v.is_correct);
            } else {
                // If already false, stay false. If true, becomes v.is_correct.
                if (currentStatus === true && v.is_correct === false) {
                    pollMap.set(v.poll_id, false);
                }
            }
        });
    }

    const pollsTaken = pollMap.size;
    let pollsIncorrect = 0;

    pollMap.forEach((isCorrect) => {
        if (!isCorrect) pollsIncorrect++;
    });

    const overallDq = pollsTaken > 0 ? (pollsIncorrect / pollsTaken) : 0;

    // AQ Calculation
    // Base 50 + Points Earned in Stage 0 (Max 50) = Max 100
    // We cap it at 100 just in case configuration allows more than 50 points.
    const aq = Math.min(100, 50 + stageZeroPoints);

    return {
        pollsTaken,
        pollsIncorrect,
        overallDq,
        rawScore,
        aq
    };
}
