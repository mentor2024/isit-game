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

    // 3. Total Possible Points Calculation
    // We need to know the max potential points for every poll the user has interacted with.
    // Fetch unique poll IDs from votes.
    const pollIds = Array.from(pollMap.keys());
    let totalPossiblePoints = 0;

    if (pollIds.length > 0) {
        // Fetch Poll Details to calculate max points
        // We need: Type, Stage, Level (for Binary), and Object Points (for MC)
        const { data: polls } = await supabase
            .from('polls')
            .select(`
                id, 
                type, 
                stage, 
                level, 
                poll_objects (points),
                quad_scores
            `)
            .in('id', pollIds);

        polls?.forEach(poll => {
            if (poll.type === 'multiple_choice') {
                // Max possible is the object with highest points
                const maxObjPoints = Math.max(...(poll.poll_objects?.map((o: any) => o.points || 0) || [0]));
                totalPossiblePoints += maxObjPoints;
            } else if (poll.type === 'quad_sorting') {
                // Quad Sorting: Max is the highest value in quad_scores map
                let maxQuad = 0;
                if (poll.quad_scores && typeof poll.quad_scores === 'object') {
                    const scores = Object.values(poll.quad_scores) as number[];
                    if (scores.length > 0) {
                        maxQuad = Math.max(...scores);
                    }
                }
                // If no scores defined, fallback
                if (maxQuad === 0) {
                    const stageMult = Math.max(1, poll.stage || 1);
                    const levelMult = Math.max(1, poll.level || 1);
                    maxQuad = (2 * stageMult * levelMult);
                }
                totalPossiblePoints += maxQuad;
            } else {
                // Binary / ISIT
                // Check if objects have points
                const objPointsSum = poll.poll_objects?.reduce((sum: number, o: any) => sum + (o.points || 0), 0) || 0;

                if (objPointsSum > 0) {
                    totalPossiblePoints += objPointsSum;
                } else {
                    // Fallback Formula (Matches submitVote logic)
                    const stageMult = Math.max(1, poll.stage || 1);
                    const levelMult = Math.max(1, poll.level || 1);
                    totalPossiblePoints += (2 * stageMult * levelMult);
                }
            }
        });
    }

    // New AQ Formula: (Points Earned / Total Possible) * 100 / (1 + DQ)
    // Points Earned = rawScore (Total Score) ?? Or just Poll Points?
    // User definition: "Number of points they have earned / total possible points available / 1+DQ"
    // Usually "Points Earned" in this context refers to the raw performance score, NOT including arbitrary bonuses?
    // If Bonus is included in RawScore, AQ might exceed 100 if Bonus makes it > Possible?
    // Bonus is awarded separately. "Raw Score" in profile includes Bonus.
    // We should probably use `pollPoints` sum from votes for "Points Earned" to compare apples to apples (Poll Performance).
    // Let's calculate sum of earned points from votes.

    // Recalculate Earned Points strictly from votes (excluding Level Bonuses)
    let earnedFromVotes = 0;
    votes?.forEach(v => earnedFromVotes += (v.points_earned || 0));

    const ratio = totalPossiblePoints > 0 ? (earnedFromVotes / totalPossiblePoints) : 0;

    // Scale to 100, dampened by DQ
    // DQ ranges 0 to 1.
    // If Perfect (Ratio 1, DQ 0) -> 1 * 100 / 1 = 100.
    // If Perfect Votes but Max DQ (Ratio 1, DQ 1) -> 1 * 100 / 2 = 50.
    // If Half Points, DQ 0 -> 0.5 * 100 / 1 = 50.

    let aq = (ratio * 100) / (1 + overallDq);

    // Cap at 100
    if (aq > 100) aq = 100;

    // Integer for display
    aq = Math.round(aq);

    return {
        pollsTaken,
        pollsIncorrect,
        overallDq,
        rawScore, // Keeps Profile Score (with bonuses)
        aq
    };
}
