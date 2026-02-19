"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";

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
    showInterstitial?: boolean;
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

            const { data: votePoints } = await supabase
                .from('poll_votes')
                .select('points_earned')
                .eq('user_id', user.id)
                .in('poll_id', allLevelPollIds);

            const pointsEarned = votePoints?.reduce((sum: number, v: any) => sum + (v.points_earned || 0), 0) || 0;

            // Bonus Formula
            const bonus = Math.round(pointsEarned / (1 + dq));

            // Only award BONUS at level end (Poll points awarded per vote)
            const totalPointsToAdd = bonus;

            if (totalPointsToAdd > 0 && currentPoll.stage > 0) {
                const serviceClient = getServiceRoleClient();

                const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
                const currentScore = profile?.score || 0;

                const { error: updateError } = await serviceClient
                    .from('user_profiles')
                    .update({ score: currentScore + totalPointsToAdd })
                    .eq('id', user.id);

                if (updateError) console.error("Error updating score:", updateError);
                console.log(`[CheckCompletion] Level Complete! Added Bonus: ${bonus}`);
            } else if (currentPoll.stage === 0) {
                console.log(`[CheckCompletion] Stage 0 Level Complete!`);
            }

            // --- PROGRESSION LOGIC ---
            // Fetch config to check for Interstitial Setting
            const { data: levelConfig } = await supabase
                .from('level_configurations')
                .select('enabled_modules, show_interstitial')
                .eq('stage', currentPoll.stage)
                .eq('level', currentPoll.level)
                .maybeSingle();

            const hasPathSelector = levelConfig?.enabled_modules?.includes('path_selector');
            // Default to true if not set
            const showInterstitial = levelConfig?.show_interstitial !== false;

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
                            const serviceClient = getServiceRoleClient();

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

                // If skipping interstitial, do NOT auto-advance. 
                // We want the user to land on the LevelCompleteScreen (which happens if current_level is still the completed one).
                // The 'advanceLevel' action called from that screen will handle the update.
                if (shouldUpdate && !showInterstitial) {
                    console.log(`[CheckCompletion] Interstitial Skipped. Returning to Poll Page to show Results.`);
                } else if (shouldUpdate) {
                    // console.log(`[CheckCompletion] Level Complete. Waiting for manual Level Up.`);
                }
            } else {
                console.log(`[CheckCompletion] Level Complete. Path Selector active.`);
            }

            revalidatePath('/', 'layout');

            return {
                levelUp: true,
                showInterstitial, // Return this new flag
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
        const supabase = await getServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // Check if poll is Stage 0 (Anon Allowed)
            const { data: poll } = await supabase.from('polls').select('stage, level, poll_order').eq('id', pollId).single();
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
            // Stage 0 Anon Logic: Save to Cookie
            const isCorrect = isWordId === pollId;

            // Save to Cookie (Simple Logic for now, mirroring MC)
            /* 
               NOTE: submitVote is for Swipe/Touch? 
               If we use this for Stage 0, we need to save progress.
               Currently submitMCVote handles most Stage 0 interactions.
               But if we use Swipe, we need this.
            */

            // Calculate Next Poll ID for Anon
            let nextPollId: string | undefined = undefined;
            let levelUp = false;
            let showInterstitial = true;

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

                if (nextPoll) {
                    nextPollId = nextPoll.id;
                } else {
                    // No next poll in level -> Level Up!
                    levelUp = true;
                    const { data: levelConfig } = await supabase
                        .from('level_configurations')
                        .select('show_interstitial')
                        .eq('stage', poll.stage)
                        .eq('level', poll.level)
                        .maybeSingle();

                    showInterstitial = levelConfig?.show_interstitial !== false;
                }
            }

            return { success: true, correct: isCorrect, has_answer: true, nextPollId, levelUp, showInterstitial };

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

        // 2. Fetch Points for the Object if Correct
        let pointsEarned = 0;
        if (correct) {
            // We need to know WHICH object was the "correct" one to get its points.
            // Actually, for IS/IT, both objects are part of the 'pair'. 
            // Usually we award points for the POLL completion.
            // But if we want per-object scoring?
            // Let's assume the points are on the objects. 
            // If both are correct, do we sum them? 
            // Or just award based on Stage/Level?
            // PREVIOUS LOGIC (in checkLevelCompletion) used: Math.floor((totalCorrectVotes / 2) * stageMult * levelMult)
            // This implies 1 point per pair if multipliers are 1.
            // User got 20 points for 10 polls. That is 2 points per poll.
            // So logic: 2 * Stage * Level? 
            // OR: poll_objects have 1 point each?

            // Let's FETCH the points from the objects involved.
            const { data: objects } = await supabase
                .from('poll_objects')
                .select('points')
                .in('id', [isWordId, itWordId]);

            if (objects) {
                pointsEarned = objects.reduce((sum: number, obj: any) => sum + (obj.points || 0), 0);
            }

            // If objects have 0 points (legacy), fallback to Formula?
            if (pointsEarned === 0) {
                // Fallback Formula matching User's observed scoring (20 pts / 10 polls = 2 pts per poll)
                // If Stage 1 Level 1 -> 1 * 1 = 1? Then 2 pts = 2 * (1*1)?
                // Yes, 1 point per correct VOTE. 2 votes per poll.
                // So we award 1 point per correct vote.
                // Since `correct` here implies BOTH are correct (RPC checks both), we award 2 points * Multiplier.

                const { data: poll } = await supabase.from('polls').select('stage, level').eq('id', pollId).single();
                const stageMult = Math.max(1, poll?.stage || 1);
                const levelMult = Math.max(1, poll?.level || 1);
                pointsEarned = 2 * stageMult * levelMult;
            }

            // Award Points
            if (pointsEarned > 0) {
                const serviceClient = getServiceRoleClient();

                // Check previous points to prevent inflation
                const { data: existingVotes } = await serviceClient
                    .from('poll_votes')
                    .select('points_earned')
                    .eq('poll_id', pollId)
                    .eq('user_id', user.id);

                const previousPointsTotal = existingVotes?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;

                // We update the votes in place
                await serviceClient
                    .from('poll_votes')
                    .update({ points_earned: pointsEarned / 2 })
                    .eq('poll_id', pollId)
                    .eq('user_id', user.id);

                // Calculate Delta
                // NOTE: logic implies we overwrite both votes with split points.
                // If previous was 0, delta is full.
                // If previous was 10 (5+5), and new is 10 (5+5), delta 0.
                const newPointsTotal = pointsEarned;
                const scoreDelta = newPointsTotal - previousPointsTotal;

                if (scoreDelta !== 0) {
                    const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
                    await serviceClient.from('user_profiles').update({ score: (profile?.score || 0) + scoreDelta }).eq('id', user.id);
                    console.log(`[SubmitVote] Score updated by ${scoreDelta}`);
                }
            }
        }

        // 3. Check Level Completion
        const completionResult = await checkLevelCompletion(supabase, user, pollId);

        revalidatePath('/', 'layout');

        return { success: true, correct, has_answer, points: pointsEarned, ...completionResult };

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
        const supabase = await getServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            const { data: poll } = await supabase.from('polls').select('stage, level, poll_order').eq('id', pollId).single();
            if (poll && poll.stage !== 0) {
                return { success: false, error: "Unauthorized" };
            }

            // Calculate Next Poll ID for Anon
            let nextPollId: string | undefined = undefined;
            let levelUp = false;
            let showInterstitial = true;

            if (poll) {
                const { data: nextPoll } = await supabase
                    .from('polls')
                    .select('id')
                    .eq('stage', poll.stage)
                    .eq('level', poll.level) // ADDED: Restrict to current level
                    .gt('poll_order', poll.poll_order)
                    .order('poll_order', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (nextPoll) {
                    nextPollId = nextPoll.id;
                } else {
                    // No next poll in level -> Level Up!
                    levelUp = true;
                    const { data: levelConfig } = await supabase
                        .from('level_configurations')
                        .select('show_interstitial')
                        .eq('stage', poll.stage)
                        .eq('level', poll.level)
                        .maybeSingle();

                    showInterstitial = levelConfig?.show_interstitial !== false;
                }
            }

            // Save to Cookie
            const cookieStore = await cookies();
            const existing = cookieStore.get('isit_anon_progress')?.value;
            let votes = existing ? JSON.parse(existing) : [];
            votes.push({ pollId, points: 0, correct: true, timestamp: Date.now() }); // Quad points complex, assume 0 or calc?
            // Re-calc quad points logic locally? It's below.
            // Let's move the point calculation UP before the user check?

            // To properly save points, we should calculate them first then save.
            // Refactoring to allow calculation fall-through.
            console.log("[Action] Anon user (stage 0), falling through to calculation (will skip DB save).");

            // We need to return EARLY here because logic below assumes user exists.
            if (!user) {
                return { success: true, correct: true, has_answer: true, nextPollId, levelUp, showInterstitial };
            }

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
                    console.log(`[Action] Stage 0 Quad Vote: Raw Points ${points}. Suppressing *awarded* points to 0.`);
                } else {
                    console.log(`[Action] Quad Pair Identified: ${pairKey}, Points: ${points}`);
                }
            } else {
                console.log(`[Action] Could not identify partner for Obj 1.`);
            }
        }

        // 3. Determine Final Save Values
        const isCorrect = points > 0;
        const pointsToAward = points; // Allow points for Stage 0

        if (!user) {
            console.log("[Action] Anon user (stage 0), saving to cookie and skipping DB save.");
            // Save to Cookie
            const cookieStore = await cookies();
            const existing = cookieStore.get('isit_anon_progress')?.value;
            let votes = existing ? JSON.parse(existing) : [];
            // Dedup
            if (!votes.find((v: any) => v.pollId === pollId)) {
                votes.push({ pollId, points: pointsToAward, correct: isCorrect, timestamp: Date.now() });
                cookieStore.set('isit_anon_progress', JSON.stringify(votes), { path: '/' });
            }
            return { success: true, correct: isCorrect, has_answer: true, nextPollId };
        }

        const votes = assignments.map((a, index) => ({
            poll_id: pollId,
            user_id: user.id,
            selected_object_id: a.objectId,
            chosen_side: a.side, // 'group_a' or 'group_b'
            is_correct: isCorrect, // Use calculated correctness based on RAW points
            points_earned: index === 0 ? pointsToAward : 0 // FIX: Only award points to the first vote to prevent 4x inflation (since 4 objects are submitted)
        }));

        console.log(`[Action] Inserting ${votes.length} votes...`);

        // Use Service Role to bypass RLS for upsert and Score update
        const serviceClient = getServiceRoleClient();

        // Check for existing votes to prevent score inflation
        const { data: existingVotes } = await serviceClient
            .from('poll_votes')
            .select('points_earned')
            .eq('poll_id', pollId)
            .eq('user_id', user.id);

        const previousPointsTotal = existingVotes?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;
        const newPointsTotal = points; // points calculated earlier (Lines 454-486)

        // IMPORTANT: We only award points to the first vote entry to prevent inflation, 
        // so newPointsTotal effectively is what we are storing in the DB for this batch.
        // Wait, the new insertion logic (Line 522) puts 'pointsToAward' on index 0.
        // So the db will sum to 'pointsToAward'.

        const scoreDelta = newPointsTotal - previousPointsTotal;

        const { error: insertError } = await serviceClient
            .from('poll_votes')
            .upsert(votes, { onConflict: 'user_id, poll_id, selected_object_id' });

        if (insertError) {
            console.error("Quad Vote Insert Error:", insertError);
            throw new Error(insertError.message);
        }
        console.log(`[Action] Votes inserted successfully.`);

        // Award Points to User Profile (Delta)
        if (scoreDelta !== 0) {
            const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
            const currentScore = profile?.score || 0;
            await serviceClient.from('user_profiles').update({ score: currentScore + scoreDelta }).eq('id', user.id);
            console.log(`[SubmitQuadVote] Score updated by ${scoreDelta} (Prev: ${previousPointsTotal}, New: ${newPointsTotal})`);
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
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Handle Anon (Stage 0) Progression via Cookie
        const cookieStore = await cookies();
        const state = { stage: nextStage, level: nextLevel };
        cookieStore.set('isit_anon_state', JSON.stringify(state), { path: '/' });
        revalidatePath('/', 'layout');
        return;
    }

    const serviceClient = getServiceRoleClient();

    await serviceClient
        .from('user_profiles')
        .update({ current_stage: nextStage, current_level: nextLevel })
        .eq('id', user.id);

    revalidatePath('/', 'layout');
}

// ... existing advanceLevel ...

export async function submitMCVote(pollId: string, selectedObjectId: string): Promise<SubmitVoteResult> {
    try {
        const supabase = await getServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        // Anon Check
        if (!user) {
            const { data: poll } = await supabase.from('polls').select('stage, level, poll_order').eq('id', pollId).single();
            if (poll && poll.stage !== 0) return { success: false, error: "Unauthorized" };

            // 1. Fetch Object for Points
            const { data: object } = await supabase.from('poll_objects').select('points').eq('id', selectedObjectId).single();
            const points = object?.points || 0;
            const isCorrect = points > 0;

            // Save to Cookie
            const cookieStore = await cookies();
            const existing = cookieStore.get('isit_anon_progress')?.value;
            let votes = existing ? JSON.parse(existing) : [];
            // Dedup
            if (!votes.find((v: any) => v.pollId === pollId)) {
                votes.push({ pollId, points, correct: isCorrect, timestamp: Date.now() });
                cookieStore.set('isit_anon_progress', JSON.stringify(votes), { path: '/' });
            }

            // Calculate Next Poll ID for Anon
            let nextPollId: string | undefined = undefined;
            let levelUp = false;
            let showInterstitial = true;

            if (poll) {
                const { data: nextPoll } = await supabase
                    .from('polls')
                    .select('id')
                    .eq('stage', poll.stage)
                    .eq('level', poll.level) // ADDED: Restrict to current level
                    .gt('poll_order', poll.poll_order)
                    .order('poll_order', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (nextPoll) {
                    nextPollId = nextPoll.id;
                } else {
                    // No next poll in level -> Level Up!
                    levelUp = true;

                    // Fetch config
                    const { data: levelConfig } = await supabase
                        .from('level_configurations')
                        .select('show_interstitial')
                        .eq('stage', poll.stage)
                        .eq('level', poll.level)
                        .maybeSingle();

                    showInterstitial = levelConfig?.show_interstitial !== false;
                }
            }

            return { success: true, correct: isCorrect, has_answer: true, nextPollId, points, levelUp, showInterstitial };
        }

        // 1. Fetch Poll & Object Info
        const { data: poll } = await supabase.from('polls').select('stage, level, poll_order').eq('id', pollId).single();
        const { data: object } = await supabase.from('poll_objects').select('points').eq('id', selectedObjectId).single();
        const points = object?.points || 0;

        // 2. Determine Scoring
        let pointsToAward = points;
        let isCorrect = points > 0;

        // 3. Save Vote & Update Score
        const serviceClient = getServiceRoleClient();

        // Check for existing vote to prevent score inflation
        const { data: existingVote } = await serviceClient
            .from('poll_votes')
            .select('points_earned')
            .eq('poll_id', pollId)
            .eq('user_id', user.id)
            .maybeSingle();

        const previousPoints = existingVote?.points_earned || 0;
        const scoreDelta = pointsToAward - previousPoints;

        // Upsert Vote (Using Upsert instead of Delete+Insert to be safeguards)
        const { error: insertError } = await serviceClient
            .from('poll_votes')
            .upsert({
                poll_id: pollId,
                user_id: user.id,
                selected_object_id: selectedObjectId,
                chosen_side: null,
                is_correct: isCorrect,
                points_earned: pointsToAward
            }, { onConflict: 'user_id, poll_id' }); // Assuming unique constraint exists? if not Delete+Insert is safer for clean slate but we need onConflict. 
        // Existing code used Delete+Insert. Let's stick to that but use the Delta.

        // actually, let's stick to the delete logic if we want to clear 'selected_object_id' history, 
        // but simple upsert is better for history tracking if we had it.
        // Let's use the Delete + Insert pattern but configured correctly with the delta.

        // ... Re-reading existing code: it deletes then inserts.
        // If we delete, we lose the record of "previousPoints" unless we fetched it first (which we did).

        await serviceClient.from('poll_votes').delete().eq('user_id', user.id).eq('poll_id', pollId);

        const { error: insertError2 } = await serviceClient
            .from('poll_votes')
            .insert({
                poll_id: pollId,
                user_id: user.id,
                selected_object_id: selectedObjectId,
                chosen_side: null,
                is_correct: isCorrect,
                points_earned: pointsToAward
            });

        if (insertError2) throw new Error(insertError2.message);

        // 4. Update Score with Delta
        if (scoreDelta !== 0) {
            const { data: profile } = await serviceClient.from('user_profiles').select('score').eq('id', user.id).single();
            await serviceClient.from('user_profiles').update({ score: (profile?.score || 0) + scoreDelta }).eq('id', user.id);
            console.log(`[SubmitMCVote] Score updated by ${scoreDelta} (Prev: ${previousPoints}, New: ${pointsToAward})`);
        }

        // 5. Completion Check
        const completionResult = await checkLevelCompletion(supabase, user, pollId);

        // 6. Next Poll
        let nextPollId: string | undefined = undefined;
        if (poll && !completionResult.levelUp) {
            const { data: nextPoll } = await supabase.from('polls').select('id')
                .eq('stage', poll.stage)
                .eq('level', poll.level)
                .gt('poll_order', poll.poll_order)
                .order('poll_order', { ascending: true })
                .limit(1)
                .maybeSingle();
            if (nextPoll) nextPollId = nextPoll.id;
        }

        revalidatePath('/', 'layout');
        return { success: true, correct: isCorrect, has_answer: true, nextPollId, ...completionResult };

    } catch (e: any) {
        console.error("SubmitMCVote Exception:", e);
        return { success: false, error: e.message };
    }
}



export async function submitLead(formData: FormData) {
    const firstName = formData.get('firstName') as string;
    const email = formData.get('email') as string;

    if (!email) return { success: false, error: "Email required" };

    const supabase = await getServerSupabase();
    const { error } = await supabase.from('leads').insert({ first_name: firstName, email });

    if (error) return { success: false, error: error.message };
    return { success: true };
}
