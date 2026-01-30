"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );
}

export type SubmitVoteResult = {
    success: boolean;
    error?: string;
    levelUp?: boolean;
    stage?: number;
    level?: number;
    correct?: boolean;
    has_answer?: boolean;
    bonus?: number;
    dq?: number;
    totalCorrectVotes?: number;
    totalVotes?: number;
    correctPolls?: number;
    totalPolls?: number;
    points?: number;
    nextPollId?: string;
};


export async function checkLevelCompletion(supabase: any, user: any, pollId: string) {
    // 2. Level Up Check
    // Get the poll we just voted on to know its Stage/Level
    const { data: currentPoll } = await supabase
        .from('polls')
        .select('stage, level')
        .eq('id', pollId)
        .single();

    if (!currentPoll) return { levelUp: false };

    console.log(`[CheckCompletion] Checking completion for Stage ${currentPoll.stage} Level ${currentPoll.level}`);

    // Get ALL poll IDs in this level
    const { data: levelPolls } = await supabase
        .from('polls')
        .select('id')
        .eq('stage', currentPoll.stage)
        .eq('level', currentPoll.level);

    const allLevelPollIds = levelPolls?.map((p: any) => p.id) || [];

    if (allLevelPollIds.length > 0) {
        // Fetch votes for the user
        const { data: userVotes } = await supabase
            .from('poll_votes')
            .select('poll_id')
            .eq('user_id', user.id)
            .in('poll_id', allLevelPollIds);

        // We need to check if *every* poll has been interacted with.
        const userVotedPollIds = Array.from(new Set(userVotes?.map((v: any) => v.poll_id))) || [];

        console.log(`[CheckCompletion] Total Polls: ${allLevelPollIds.length}, User Voted Polls: ${userVotedPollIds.length}`);

        // Check completion
        const hasCompletedLevel = allLevelPollIds.every((id: string) => userVotedPollIds.includes(id));

        if (hasCompletedLevel) {
            // Check for total correct answers in this level to calculate bonus
            const { data: correctVotes } = await supabase
                .from('poll_votes')
                .select('id')
                .eq('user_id', user.id)
                .in('poll_id', allLevelPollIds)
                .eq('is_correct', true);

            const totalCorrectVotes = correctVotes?.length || 0;

            const { count: totalVotesCount } = await supabase
                .from('poll_votes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('poll_id', allLevelPollIds);

            const totalVotes = totalVotesCount || 0;
            const wrongVotes = totalVotes - totalCorrectVotes;

            // DQ Logic
            const dq = totalVotes > 0 ? (wrongVotes / totalVotes) : 0;

            const stageMult = currentPoll.stage || 1;
            const levelMult = currentPoll.level || 1;

            // Points Formula
            const pointsEarned = Math.floor((totalCorrectVotes / 2) * stageMult * levelMult);

            // Bonus Formula
            const bonus = Math.round(pointsEarned / (1 + dq));

            const totalPointsToAdd = pointsEarned + bonus;

            if (totalPointsToAdd > 0 && currentPoll.stage > 0) {
                const serviceClient = createServerClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    { cookies: { getAll() { return [] }, setAll() { } } }
                );

                const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
                const currentScore = profile?.score || 0;

                const { error: updateError } = await serviceClient
                    .from('user_profiles')
                    .update({ score: currentScore + totalPointsToAdd })
                    .eq('id', user.id);

                if (updateError) console.error("Error updating score:", updateError);
                console.log(`[CheckCompletion] Level Complete! Added ${totalPointsToAdd} (Points: ${pointsEarned}, Bonus: ${bonus})`);
            } else if (currentPoll.stage === 0) {
                console.log(`[CheckCompletion] Stage 0 Level Complete! Zero points awarded.`);
            }

            // --- PROGRESSION LOGIC ---
            const { data: levelConfig } = await supabase
                .from('level_configurations')
                .select('enabled_modules')
                .eq('stage', currentPoll.stage)
                .eq('level', currentPoll.level)
                .maybeSingle();

            const hasPathSelector = levelConfig?.enabled_modules?.includes('path_selector');

            if (!hasPathSelector) {
                // Check for Next Level in SAME Stage
                const { count: nextLevelPolls } = await supabase
                    .from('polls')
                    .select('id', { count: 'exact', head: true })
                    .eq('stage', currentPoll.stage)
                    .eq('level', currentPoll.level + 1);

                let nextStage = currentPoll.stage;
                let nextLevel = currentPoll.level;
                let shouldUpdate = false;

                if (nextLevelPolls && nextLevelPolls > 0) {
                    // Move to Next Level
                    nextLevel = currentPoll.level + 1;
                    shouldUpdate = true;
                } else {
                    // Check for First Level in NEXT Stage
                    const { count: nextStagePolls } = await supabase
                        .from('polls')
                        .select('id', { count: 'exact', head: true })
                        .eq('stage', currentPoll.stage + 1)
                        .eq('level', 1);

                    if (nextStagePolls && nextStagePolls > 0) {
                        // Move to Next Stage
                        nextStage = currentPoll.stage + 1;
                        nextLevel = 1;
                        shouldUpdate = true;

                        // --- AWARD STAGE BONUS ---
                        const { data: stageConfig } = await supabase
                            .from('stage_configurations')
                            .select('completion_bonus')
                            .eq('stage', currentPoll.stage)
                            .single();

                        const stageBonus = stageConfig?.completion_bonus || 0;

                        if (stageBonus > 0) {
                            const serviceClient = createServerClient(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                                { cookies: { getAll() { return [] }, setAll() { } } }
                            );

                            const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
                            const currentScore = profile?.score || 0;

                            await serviceClient
                                .from('user_profiles')
                                .update({ score: currentScore + stageBonus })
                                .eq('id', user.id);

                            console.log(`[CheckCompletion] Stage ${currentPoll.stage} Complete! Awarded Stage Bonus: ${stageBonus}`);
                        }
                    }
                }

                if (shouldUpdate) {
                    /*
                    // DISABLE AUTO-ADVANCE: Use Level Up Page
                    const serviceClient = createServerClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!,
                        { cookies: { getAll() { return [] }, setAll() { } } }
                    );
                    await serviceClient
                        .from('user_profiles')
                        .update({ current_stage: nextStage, current_level: nextLevel })
                        .eq('id', user.id);

                    console.log(`[CheckCompletion] Auto-incremented to Stage ${nextStage} Level ${nextLevel}`);
                    */
                    console.log(`[CheckCompletion] Level Complete. Waiting for manual Level Up.`);
                }
            } else {
                console.log(`[CheckCompletion] Level Complete. Path Selector active.`);
            }

            revalidatePath('/', 'layout');

            return {
                levelUp: true,
                stage: currentPoll.stage,
                level: currentPoll.level,
                bonus,
                dq,
                totalCorrectVotes: totalCorrectVotes,
                totalVotes,
                correctPolls: totalCorrectVotes / 2,
                totalPolls: allLevelPollIds.length,
                points: pointsEarned
            };
        }
    }

    return { levelUp: false };
}

export async function submitVote(pollId: string, isWordId: string, itWordId: string): Promise<SubmitVoteResult> {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // Check if poll is Stage 0 (Anon Allowed)
            const { data: poll } = await supabase.from('polls').select('stage').eq('id', pollId).single();
            if (poll && poll.stage !== 0) {
                return { success: false, error: "Unauthorized" };
            }
            // If Stage 0, proceed (user will be null, vote will need to handle that?)
            // Wait, poll_votes table needs user_id.
            // If we are truly anon, we might need a temporary ID or just allow it if the table allows null user_id?
            // "The Stage Zero polls only should be accessible to visitors who are not logged in."
            // If we want to RECORD the vote, we need an ID.
            // VotingInterface does signInAnonymously().
            // IF signInAnonymously() works, 'user' SHOULD be present (as an anon user).
            // So if (!user) means signInAnonymously FAILED or wasn't called.
            // If VotingInterface called it, user should be there.
            // But if the User says "Requires a login", maybe they mean explicit email login?
            // If so, anon login counts as a user.

            // IF the user is anon, their role is 'anon' or 'authenticated' (with is_anonymous)?
            // Supabase treats anon users as authenticated users with a specific flag.

            // So if (!user) triggers, it means NO session at all.
            // We should arguably return error, but maybe the client should have signed in.
            return { success: false, error: "Unauthorized - Please refresh to sign in anonymously." };
        }

        // 1. Submit Vote via RPC
        const { data: voteResult, error: voteError } = await supabase.rpc('vote_isit', {
            p_is_word_id: isWordId,
            p_it_word_id: itWordId,
            p_poll_id: pollId,
        });

        if (voteError) {
            console.error("Vote RPC Error:", voteError);
            return { success: false, error: voteError.message };
        }

        let correct = false;
        let has_answer = false;

        if (Array.isArray(voteResult) && voteResult.length > 0) {
            correct = voteResult[0].correct;
            has_answer = voteResult[0].has_answer;
        } else if (voteResult && typeof voteResult === 'object') {
            correct = voteResult.correct;
            has_answer = voteResult.has_answer;
        }

        // 2. Check Level Completion
        const completionResult = await checkLevelCompletion(supabase, user, pollId);

        revalidatePath('/', 'layout');

        return { success: true, correct, has_answer, ...completionResult };

    } catch (e: any) {
        console.error("SubmitVote Exception:", e);
        return { success: false, error: e.message };
    }
}

export type QuadAssignment = {
    objectId: string;
    side: "group_a" | "group_b" | null;
}

export async function submitQuadVote(pollId: string, assignments: QuadAssignment[]): Promise<SubmitVoteResult> {
    console.log(`[Action] submitQuadVote for Poll ${pollId} with ${assignments.length} assignments`);
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            const { data: poll } = await supabase.from('polls').select('stage, level, poll_order').eq('id', pollId).single();
            if (poll && poll.stage !== 0) {
                return { success: false, error: "Unauthorized" };
            }

            // Calculate Next Poll ID for Anon
            let nextPollId: string | undefined = undefined;
            if (poll) {
                const { data: nextPoll } = await supabase
                    .from('polls')
                    .select('id')
                    .eq('stage', poll.stage)
                    .eq('level', poll.level)
                    .gt('poll_order', poll.poll_order)
                    .order('poll_order', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                if (nextPoll) nextPollId = nextPoll.id;
            }

            console.log("[Action] Anon user (stage 0), skipping DB save. Next Poll:", nextPollId);
            return { success: true, correct: true, has_answer: true, nextPollId };
        }

        if (!assignments || assignments.length === 0) return { success: false, error: "No assignments provided" };

        // 1. Fetch Poll to get Quad Scores AND Order Info
        const { data: poll } = await supabase
            .from('polls')
            .select('quad_scores, stage, level, poll_order')
            .eq('id', pollId)
            .single();

        let points = 0;
        let pairKey = "";
        let nextPollId: string | undefined = undefined;

        if (poll && poll.quad_scores) {
            // Determine Pairing for Object 1
            // We assume objects are named/IDd such that we can identify "1".
            // assignments have objectId.
            // The objectId format created in poll-actions is `poll:{pollId}:{index}` (e.g. index 1, 2, 3, 4).
            // We need to parse indices from objectIds.

            const getIndex = (id: string) => {
                const parts = id.split(':');
                return parseInt(parts[parts.length - 1]);
            };

            const groupA = assignments.filter(a => a.side === 'group_a').map(a => getIndex(a.objectId));
            const groupB = assignments.filter(a => a.side === 'group_b').map(a => getIndex(a.objectId));

            // Find which group has Index 1
            let partnerIndex = -1;
            if (groupA.includes(1)) {
                partnerIndex = groupA.find(i => i !== 1) || -1;
            } else if (groupB.includes(1)) {
                partnerIndex = groupB.find(i => i !== 1) || -1;
            }

            if (partnerIndex !== -1) {
                // Construct key: 1-2, 1-3, or 1-4.
                // Ensure sorting? The keys are stored as "1-2", "1-3", "1-4".
                // partnerIndex is 2, 3, or 4.
                pairKey = `1-${partnerIndex}`;
                points = poll.quad_scores[pairKey] || 0;

                if (poll.stage === 0) {
                    points = 0;
                    console.log(`[Action] Stage 0 Quad Vote: Points suppressed to 0.`);
                } else {
                    console.log(`[Action] Quad Pair Identified: ${pairKey}, Points: ${points}`);
                }
            } else {
                console.log(`[Action] Could not identify partner for Obj 1.`);
            }
        }

        // 2. Prepare Votes
        // If user is null (Stage 0 Anon), we technically can't save to poll_votes if user_id is NOT NULL.
        // Assuming we want to track it, we need a user. 
        // If the client calls this verify, it implies they failed auth.
        // For now, let's assume we skip saving votes if no user, OR throw error if user required.
        // BUT, if we want to allow "visitors", maybe we just return success without saving?
        // OR we trust the client to attempt anon auth.

        if (!user) {
            // If we are here, it means Stage 0 check passed.
            // We can return success (dummy) or fail. 
            // Without a user ID, we can't save progress.
            // Let's return success to allow UI to proceed, but NOT save to DB.
            console.log("[Action] Anon user (stage 0), skipping DB save.");
            return { success: true, correct: points > 0, has_answer: true, nextPollId };
        }

        const votes = assignments.map(a => ({
            poll_id: pollId,
            user_id: user.id,
            selected_object_id: a.objectId,
            chosen_side: a.side, // 'group_a' or 'group_b'
            is_correct: points > 0 // improving correctness definition
        }));

        console.log(`[Action] Inserting ${votes.length} votes...`);

        // Use Service Role to bypass RLS for upsert and Score update
        const serviceClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: { getAll() { return [] }, setAll() { } } }
        );

        const { error: insertError } = await serviceClient
            .from('poll_votes')
            .upsert(votes, { onConflict: 'user_id, poll_id, selected_object_id' });

        if (insertError) {
            console.error("Quad Vote Insert Error:", insertError);
            throw new Error(insertError.message);
        }
        console.log(`[Action] Votes inserted successfully.`);

        // Award Points to User Profile
        if (points > 0) {
            const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
            const currentScore = profile?.score || 0;
            await serviceClient.from('user_profiles').update({ score: currentScore + points }).eq('id', user.id);
        }

        const completionResult = await checkLevelCompletion(supabase, user, pollId);
        console.log(`[Action] Level Completion Result:`, completionResult);

        // Find Next Poll in Sequence (for Manual Redirection)
        // nextPollId is already declared at top
        if (!completionResult.levelUp && poll) {
            const { data: nextPoll } = await supabase
                .from('polls')
                .select('id')
                .eq('stage', poll.stage)
                .eq('level', poll.level)
                .gt('poll_order', poll.poll_order)
                .order('poll_order', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (nextPoll) nextPollId = nextPoll.id;
        }

        revalidatePath('/', 'layout');
        return { success: true, correct: points > 0, has_answer: true, nextPollId, ...completionResult };

    } catch (e: any) {
        console.error("SubmitQuadVote Exception:", e);
        return { success: false, error: e.message };
    }
}

export async function advanceLevel(nextStage: number, nextLevel: number) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    await serviceClient
        .from('user_profiles')
        .update({ current_stage: nextStage, current_level: nextLevel })
        .eq('id', user.id);

    revalidatePath('/', 'layout');
}

export async function submitLead(formData: FormData) {
    const firstName = formData.get('firstName') as string;
    const email = formData.get('email') as string;

    if (!email) return { success: false, error: "Email required" };

    const supabase = await createSupabaseClient();
    const { error } = await supabase.from('leads').insert({ first_name: firstName, email });

    if (error) return { success: false, error: error.message };
    return { success: true };
}
