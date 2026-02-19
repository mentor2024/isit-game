import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";
import { getServerSupabase } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import VotingInterface from "@/components/VotingInterface";
import Link from "next/link";
import QuadGroupingInterface from "@/components/QuadGroupingInterface";
import MultipleChoiceInterface from "@/components/MultipleChoiceInterface";
import LevelCompleteScreen from "@/components/LevelCompleteScreen";
import { ChevronRight, MoveRight } from "lucide-react";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";
import { advanceLevel } from "@/app/(main)/poll/actions";
import { getUserMetrics } from "@/lib/metrics";
import { replaceMessageVariables } from "@/lib/messageUtils";
import { resolveDynamicMessageVariables } from "@/lib/server/messageVariables";
import FeedbackDialog from "@/components/FeedbackDialog";
import DiscussionForum from "@/components/discussion/DiscussionForum";

export const dynamic = 'force-dynamic';

export default async function PollPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await getServerSupabase();
    const params = await searchParams;
    const previewId = params.preview as string;

    // 1. Get Current User (Auth or Anon)
    const { data: { user } } = await supabase.auth.getUser();

    let activePoll = null;

    // Fetch role & progress
    let currentStage = 1;
    let currentLevel = 1;
    let role = 'user';

    // Defined here for scope access
    let votedPollIds: string[] = [];
    let voteError: any = null;

    if (user) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, current_stage, current_level, avatar_name, avatar_image')
            .eq('id', user.id)
            .single();

        if (profile) {
            role = profile.role || 'user';
            currentStage = profile.current_stage ?? 0;
            currentLevel = profile.current_level || 1;
            console.log(`[PollPage] User ${user.id} -> Stage: ${currentStage}, Level: ${currentLevel}`);
        } else {
            // Profile missing?
            console.log(`[PollPage] User ${user.id} has NO PROFILE. Defaulting to Stage 0.`);
            currentStage = 0;
            currentLevel = 1;
        }

        // PREVIEW MODE CHECK
        if (previewId && (role === 'admin' || role === 'superadmin')) {
            const { data: previewPoll } = await supabase
                .from("polls")
                .select("*, poll_objects(*)")
                .eq('id', previewId)
                .single();

            if (previewPoll) {
                activePoll = previewPoll;
                console.log(`[PollPage] Previewing Poll ${activePoll.id}`);
            }
        }

        if (!activePoll) {
            // 2. Get IDs of polls user has already voted on
            // Use Service Role to bypass RLS and ensure we get ALL votes
            // Using direct supabase-js client to avoid SSR/cookie issues with service role

            const serviceClient = getServiceRoleClient();

            const { data: votedPolls, error } = await serviceClient
                .from("poll_votes")
                .select("poll_id")
                .eq("user_id", user.id);

            voteError = error;
            votedPollIds = votedPolls?.map((v: any) => v.poll_id) || [];

            if (voteError) {
                console.error("[PollPage] Vote Fetch Error:", voteError);
            }

            console.log(`[PollPage] Voted Poll IDs count: ${votedPollIds.length}`);

            // 3. Fetch a poll NOT in that list, specific to CURRENT STAGE/LEVEL
            // Use serviceClient if available (robustness), otherwise fallback to supabase (auth context)

            // Always use service client for poll fetching to bypass RLS
            const queryTarget = voteError === null ? getServiceRoleClient() : supabase;

            let query = queryTarget
                .from("polls")
                .select("*, poll_objects(id, text, image_url, points, correct_side)")
                .eq('stage', currentStage)
                .eq('level', currentLevel)
                .order('poll_order', { ascending: true })
                .limit(1);

            if (votedPollIds.length > 0) {
                query = query.not('id', 'in', `(${votedPollIds.join(',')})`);
            }

            const { data, error } = await query.maybeSingle();
            if (error) console.error("[PollPage] Error fetching active poll:", error);
            activePoll = data;

            if (activePoll) {
                console.log(`[PollPage] Found Active Poll: ${activePoll.id} (Order: ${activePoll.poll_order})`);
            } else {
                console.log(`[PollPage] No active poll found for Stage ${currentStage} Level ${currentLevel}`);
            }
        }
    } else {
        // TRULY ANONYMOUS (No Session at all) -> Cookie Fallback
        // Use SERVICE ROLE to ensure points are fetched
        const serviceClient = getServiceRoleClient();

        // Read Anon Cookie for Progress
        const cookieStore = await cookies();
        const anonCookie = cookieStore.get('isit_anon_progress')?.value; // Votes
        const anonStateCookie = cookieStore.get('isit_anon_state')?.value; // Stage/Level State

        let anonStage = 0;
        let anonLevel = 1;

        if (anonStateCookie) {
            try {
                const state = JSON.parse(anonStateCookie);
                if (typeof state.stage === 'number') anonStage = state.stage;
                if (typeof state.level === 'number') anonLevel = state.level;
            } catch (e) {
                console.error("Failed to parse anon state cookie:", e);
            }
        }

        // Update scope variables
        currentStage = anonStage;
        currentLevel = anonLevel;

        const anonVotes = anonCookie ? JSON.parse(anonCookie) : [];
        votedPollIds = anonVotes.map((v: any) => v.pollId);

        let query = serviceClient
            .from("polls")
            .select("*, poll_objects(id, text, image_url, points, correct_side)")
            .eq('stage', anonStage)
            .eq('level', anonLevel)
            .order('poll_order', { ascending: true })
            .limit(1);

        if (votedPollIds.length > 0) {
            query = query.not('id', 'in', `(${votedPollIds.join(',')})`);
        }

        const { data } = await query.maybeSingle();

        if (data && data.poll_objects) {
            console.log(`[PollPage] Anon Service Fetch: Found ${data.poll_objects.length} objects.`);
        }
        activePoll = data;
    }

    // ------------------------------------------------------------------
    // CASE 1: NO ACTIVE POLL FOUND (Level Complete / Empty)
    // ------------------------------------------------------------------
    if (!activePoll) {
        // Check if there ARE polls for this level (meaning we finished it)
        const { count } = await supabase
            .from('polls')
            .select('*', { count: 'exact', head: true })
            .eq('stage', currentStage)
            .eq('level', currentLevel);

        const hasPolls = (count || 0) > 0;

        // Auto-Advance Logic
        // Check for User OR Anon Votes
        const cookieStore = await cookies();
        const anonCookie = cookieStore.get('isit_anon_progress')?.value;
        const hasAnonVotes = !!anonCookie;

        if (hasPolls && (user || hasAnonVotes)) {
            const { data: levelConfig } = await supabase
                .from('level_configurations')
                .select('enabled_modules')
                .eq('stage', currentStage)
                .eq('level', currentLevel)
                .maybeSingle();

            const hasPathSelector = levelConfig?.enabled_modules?.includes('path_selector');

            if (!hasPathSelector) {
                // Check for Next Level (Linear)
                const { count: nextLevelCount } = await supabase
                    .from('polls')
                    .select('id', { count: 'exact', head: true })
                    .eq('stage', currentStage)
                    .eq('level', currentLevel + 1);

                let nextStage = currentStage;
                let nextLevel = currentLevel;
                let advance = false;

                if (nextLevelCount && nextLevelCount > 0) {
                    nextLevel = currentLevel + 1;
                    advance = true;
                } else {
                    // Check Next Stage
                    const { count: nextStageCount } = await supabase
                        .from('polls')
                        .select('id', { count: 'exact', head: true })
                        .eq('stage', currentStage + 1)
                        .eq('level', 1);

                    if (nextStageCount && nextStageCount > 0) {
                        nextStage = currentStage + 1;
                        nextLevel = 1;
                        advance = true;
                    }
                }

                if (advance) {
                    // Determine Grade/Score for the Screen
                    // --- Determine Grade/Score & Tiers ---
                    // User is guaranteed here due to outer check if (hasPolls && user)

                    let pointsEarned = 0;
                    let bonus = 0;
                    let dq = 0;
                    let tier = 'C';
                    let dynamicTitle = undefined;
                    let dynamicMessage = undefined;
                    let aq = 0;
                    let metrics = { aq: 0, overallDq: 0, rawScore: 0 };

                    if (user) {
                        // Get all poll IDs
                        const { data: allPollsInLevel } = await supabase
                            .from('polls')
                            .select('id')
                            .eq('stage', currentStage)
                            .eq('level', currentLevel);
                        const allPollIds = allPollsInLevel?.map(p => p.id) || [];

                        // 1. Calculate Score & DQ
                        const { data: correctVotes } = await supabase
                            .from('poll_votes')
                            .select('id')
                            .eq('user_id', user.id)
                            .in('poll_id', allPollIds)
                            .eq('is_correct', true);

                        const totalCorrect = correctVotes?.length || 0;

                        const { count: totalVotesCount } = await supabase
                            .from('poll_votes')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                            .in('poll_id', allPollIds);

                        const totalVotes = totalVotesCount || 0;
                        const wrong = totalVotes - totalCorrect;
                        dq = totalVotes > 0 ? wrong / totalVotes : 0;

                        // Fetch Points
                        const { data: votePoints } = await supabase
                            .from('poll_votes')
                            .select('points_earned')
                            .eq('user_id', user.id)
                            .in('poll_id', allPollIds);

                        const totalPoints = votePoints?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;
                        pointsEarned = totalPoints;

                        // Calculate Bonus (Stage > 0)
                        if (currentStage > 0) {
                            pointsEarned = Math.floor((totalCorrect / 2) * currentStage * currentLevel);
                            bonus = Math.round(pointsEarned / (1 + dq));
                        }

                        // Metrics
                        metrics = await getUserMetrics(supabase, user.id);
                        aq = metrics.aq;

                    } else {
                        // ANON CALCULATION using Cookie
                        const cookieStore = await cookies();
                        const anonCookie = cookieStore.get('isit_anon_progress')?.value;
                        const anonVotes = anonCookie ? JSON.parse(anonCookie) : [];

                        const totalVotes = anonVotes.length;
                        const correctVotes = anonVotes.filter((v: any) => v.correct).length;
                        const wrong = totalVotes - correctVotes;
                        dq = totalVotes > 0 ? wrong / totalVotes : 0;

                        pointsEarned = anonVotes.reduce((sum: number, v: any) => sum + (v.points || 0), 0);

                        // Anon AQ Calc
                        aq = 50 + pointsEarned;
                        if (aq > 100) aq = 100;

                        metrics = { aq, overallDq: dq, rawScore: pointsEarned };
                    }

                    // 3. Determine Score needed for Tier Matching
                    const scoreForTiering = currentStage === 0 ? aq : (pointsEarned + bonus);

                    console.log(`[PollPage] Tiering Calc: Stage=${currentStage}, Score=${scoreForTiering} (Mode: ${currentStage === 0 ? 'AQ' : 'Points+Bonus'})`);

                    // 4. Match Tier from Config
                    const { data: levelConfig } = await supabase
                        .from('level_configurations')
                        .select('*')
                        .eq('stage', currentStage)
                        .eq('level', currentLevel)
                        .single();

                    if (levelConfig?.score_tiers) {
                        type ScoreTier = { min_score: number; tier?: string; title?: string; message?: string };
                        const tiers = levelConfig.score_tiers as unknown as ScoreTier[];
                        const sortedTiers = [...tiers].sort((a, b) => b.min_score - a.min_score);
                        const matchedTier = sortedTiers.find(t => scoreForTiering >= t.min_score);

                        if (matchedTier) {
                            const index = sortedTiers.indexOf(matchedTier);
                            const tierMap = ['S', 'B', 'C', 'D', 'F'];
                            tier = matchedTier.tier || tierMap[index] || 'C';
                            dynamicTitle = matchedTier.title;
                            dynamicMessage = matchedTier.message;
                            console.log(`[PollPage] Matched Tier: ${tier} (Min: ${matchedTier.min_score})`);
                        }
                    } else {
                        // Fallback
                        if (currentStage === 0) {
                            if (scoreForTiering >= 90) tier = 'S';
                            else if (scoreForTiering >= 70) tier = 'B';
                            else tier = 'C';
                        } else {
                            tier = 'C';
                        }
                    }

                    // 5. Variable Substitution
                    if (dynamicMessage) {
                        try {
                            if (user) {
                                dynamicMessage = await resolveDynamicMessageVariables(supabase, dynamicMessage, user.id);
                            }
                            dynamicMessage = replaceMessageVariables(dynamicMessage, {
                                dq: metrics.overallDq,
                                aq: metrics.aq,
                                pointTotal: metrics.rawScore,
                                lastDq: dq,
                                lastScore: pointsEarned + bonus
                            });
                        } catch (e) {
                            console.error("Error substituting variables:", e);
                        }
                    }

                    // 6. Assessment Content Substitution
                    let resolvedAssessmentContent = levelConfig?.awareness_assessment;
                    if (resolvedAssessmentContent) {
                        try {
                            if (user) {
                                resolvedAssessmentContent = await resolveDynamicMessageVariables(supabase, resolvedAssessmentContent, user.id);
                            }
                            resolvedAssessmentContent = replaceMessageVariables(resolvedAssessmentContent, {
                                dq: metrics.overallDq,
                                aq: metrics.aq,
                                pointTotal: metrics.rawScore,
                                lastDq: dq,
                                lastScore: pointsEarned + bonus
                            });
                        } catch (e) {
                            console.error("Error substituting variables for assessment:", e);
                        }
                    }

                    return (
                        <LevelCompleteScreen
                            stage={currentStage}
                            level={currentLevel}
                            score={pointsEarned + bonus}
                            pointsEarned={pointsEarned}
                            bonus={bonus}
                            dq={dq}
                            tier={tier}
                            nextStage={nextStage}
                            nextLevel={nextLevel}
                            isStageComplete={nextStage > currentStage}
                            customTitle={dynamicTitle}
                            customMessage={dynamicMessage}
                            assessmentContent={resolvedAssessmentContent}
                            onAdvance={advanceLevel}
                            isLoggedIn={!!user && !user.is_anonymous}
                        />
                    );

                }
            }
        }

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-12 rounded-3xl shadow-xl text-center border-2 border-black">
                    <h1 className="text-4xl font-black mb-4">
                        {hasPolls ? "Level Complete!" : "No Polls Found"}
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        {hasPolls
                            ? `You have finished Stage ${currentStage} Level ${currentLevel}.`
                            : "There are no polls configured for this level yet."}
                    </p>
                    {hasPolls ? (
                        <a href={`/levelup?stage=${currentStage}&level=${currentLevel}`} className="block w-full bg-yellow-400 text-black py-3 rounded-full text-lg font-black hover:scale-105 transition-transform mb-4">
                            Go to Level Up
                        </a>
                    ) : (
                        <a href="/poll" className="block text-gray-400 hover:text-black mb-4 text-sm font-bold">Refresh</a>
                    )}
                    {(role === 'admin' || role === 'superadmin') && (
                        <a href="/admin" className="inline-block bg-black text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform mt-4">
                            Manage Polls (Admin)
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // CASE 2: ACTIVE POLL FOUND -> DETERMINE INSTRUCTIONS & SHOW POLL
    // ------------------------------------------------------------------

    let displayInstructions = activePoll.instructions;
    let previousPollTitle = null;

    // START: Logic for Conditional Formatting
    let instructionStyles = {
        container: "bg-gray-50 border-gray-200", // Default neutral
        text: "text-gray-600",
        title: "text-gray-900"
    };

    let lastDq = 0;
    let lastScore = 0;

    if (user && votedPollIds.length > 0 && activePoll.poll_order > 1) {
        // Find most recent vote AND fetch the feedback columns from that poll
        const { data: latestVote } = await supabase
            .from("poll_votes")
            .select("poll_id, is_correct, created_at, polls(title, feedback_correct, feedback_incorrect)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestVote) {
            console.log(`[PollPage] Previous Vote Found: Poll ${latestVote.poll_id}`);

            // Fetch ALL votes for this specific poll to calculate LastDQ & LastScore correctly
            const { data: pollVotes } = await supabase
                .from("poll_votes")
                .select("is_correct, points_earned")
                .eq("user_id", user.id)
                .eq("poll_id", latestVote.poll_id);

            const totalVotesForPoll = pollVotes?.length || 0;
            const wrongVotesForPoll = pollVotes?.filter(v => !v.is_correct).length || 0;
            const pointsEarnedForPoll = pollVotes?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;

            lastDq = totalVotesForPoll > 0 ? (wrongVotesForPoll / totalVotesForPoll) : 0;
            lastScore = pointsEarnedForPoll;

            // @ts-ignore
            if (latestVote.polls) {
                // @ts-ignore
                previousPollTitle = latestVote.polls.title;
            }

            // Verify if previous poll was FULLY correct (all objects)
            const allCorrect = wrongVotesForPoll === 0; // Simplified using filtered count
            console.log(`[PollPage] All Correct: ${allCorrect} (${totalVotesForPoll} votes)`);

            if (allCorrect) {
                // @ts-ignore
                if (latestVote.polls?.feedback_correct) {
                    // @ts-ignore
                    displayInstructions = latestVote.polls.feedback_correct;
                    instructionStyles = {
                        container: "bg-green-50 border-green-500",
                        text: "text-green-800",
                        title: "text-green-900"
                    };
                    console.log(`[PollPage] Showing CORRECT instructions from Previous Poll`);
                }
            } else {
                // @ts-ignore
                if (latestVote.polls?.feedback_incorrect) {
                    // @ts-ignore
                    displayInstructions = latestVote.polls.feedback_incorrect;
                    instructionStyles = {
                        container: "bg-red-50 border-red-500",
                        text: "text-red-800",
                        title: "text-red-900"
                    };
                    console.log(`[PollPage] Showing INCORRECT instructions from Previous Poll`);
                }
            }
        } else {
            console.log(`[PollPage] No previous vote found despite votedPollIds existing.`);
        }
    }

    // --- Metrics & Variable Substitution ---
    let finalInstructions = displayInstructions || "";
    if (user) {
        // Fetch overall metrics
        const metrics = await getUserMetrics(supabase, user.id);

        try {
            // 1. Resolve Q&A Variables (Server-side)
            finalInstructions = await resolveDynamicMessageVariables(supabase, finalInstructions, user.id);
        } catch (e) {
            console.error("Error substituting Q&A variables for instructions:", e);
        }

        // Combine with Last Poll metrics
        finalInstructions = replaceMessageVariables(finalInstructions, {
            dq: metrics.overallDq,
            aq: metrics.aq,
            pointTotal: metrics.rawScore,
            lastDq: lastDq,
            lastScore: lastScore
        });
    }
    // ----------------------------------------

    // Helper: Simple seeded random number generator
    function createSeededRandom(seedStr: string) {
        let h = 0x811c9dc5;
        for (let i = 0; i < seedStr.length; i++) {
            h ^= seedStr.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        let seed = h >>> 0;
        return function () {
            seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
            return ((seed >>> 0) / 4294967296);
        }
    }

    // Seeded Random removed to allow fresh randomization on reload
    // const seedString = `${activePoll.id}-${user ? user.id : 'anon'}`;
    // const rng = createSeededRandom(seedString);
    const rng = Math.random;

    // Randomize Words (Objects)
    const objects = activePoll.poll_objects ? [...activePoll.poll_objects] : [];
    for (let i = objects.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [objects[i], objects[j]] = [objects[j], objects[i]];
    }

    // Randomize Sides
    const sides: ("IS" | "IT")[] = rng() > 0.5 ? ["IS", "IT"] : ["IT", "IS"];

    // Randomize Title Words
    let displayTitle = activePoll.title;
    if (displayTitle.includes(" | ")) {
        const titleParts = displayTitle.split(" | ");
        for (let i = titleParts.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [titleParts[i], titleParts[j]] = [titleParts[j], titleParts[i]];
        }
        displayTitle = titleParts.join(" | ");
    }

    // Calculate Next Poll ID for Navigation (Critical for Anon)
    const { data: nextPoll } = await supabase
        .from('polls')
        .select('id')
        .eq('stage', activePoll.stage)
        .eq('level', activePoll.level)
        .gt('poll_order', activePoll.poll_order)
        .order('poll_order', { ascending: true })
        .limit(1)
        .maybeSingle();

    const nextPollId = nextPoll?.id;

    // --- DEBUG: Calculate Current Stage Score for Display ---
    let pointsEarnedInStage = 0;
    if (user) {
        // 1. Get all poll IDs for this stage first (Robustness over Joins)
        // Use SERVICE ROLE to ensure we find the polls regardless of weird RLS
        const serviceClient = getServiceRoleClient();

        const { data: stagePolls } = await serviceClient
            .from('polls')
            .select('id')
            .eq('stage', activePoll?.stage ?? 0);

        const stagePollIds = stagePolls?.map(p => p.id) || [];

        if (stagePollIds.length > 0) {
            const { data: stageVotes } = await supabase
                .from('poll_votes')
                .select('points_earned')
                .eq('user_id', user.id)
                .in('poll_id', stagePollIds);

            pointsEarnedInStage = stageVotes?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;
            console.log(`[PollPage] Running Total for Stage ${activePoll?.stage}: ${pointsEarnedInStage} (Votes: ${stageVotes?.length})`);
        }
    }

    // --- Fetch Level Config (for Modules) ---
    const { data: levelConfig } = await supabase
        .from('level_configurations')
        .select('enabled_modules')
        .eq('stage', activePoll?.stage ?? 0)
        .eq('level', activePoll?.level ?? 1)
        .maybeSingle();

    const isDiscussionEnabled = levelConfig?.enabled_modules?.includes('discussion_forum');
    // ----------------------------------------
    // --------------------------------------------------------

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-4 bg-gray-50 p-4 relative space-y-4">
            <div className="w-full max-w-xl flex items-center gap-2 text-sm font-bold text-black justify-center">
                <span>{activePoll.stage === 0 ? "Stage Zero" : `Stage ${STAGE_NAMES[activePoll.stage - 1]}`}</span>
                <ChevronRight size={14} />
                <span>Level {LEVEL_LETTERS[activePoll.level - 1]}</span>
                <ChevronRight size={14} />
                <span>Poll {activePoll.poll_order}</span>
            </div>

            {/* Floating Feedback Dialog */}
            <FeedbackDialog
                context={{
                    stage: activePoll.stage,
                    level: activePoll.level,
                    pollId: activePoll.id,
                    pollOrder: activePoll.poll_order
                }}
            />

            {/* Header Outside Card */}
            <div className="text-center w-full max-w-3xl">
                {/* Previous Poll Feedback Container */}
                {previousPollTitle && (
                    <div className={`mb-6 p-6 rounded-3xl border relative ${instructionStyles.container}`}>
                        <FeedbackDialog
                            defaultType="Content"
                            context={{
                                stage: activePoll.stage,
                                level: activePoll.level,
                                pollId: activePoll.id,
                                pollOrder: activePoll.poll_order,
                                source: 'Previous Poll Feedback'
                            }}
                        />
                        <h3 className={`font-black text-xl mb-2 ${instructionStyles.title}`}>{previousPollTitle}</h3>
                        <div
                            className={`text-base font-medium [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 ${instructionStyles.text}`}
                            dangerouslySetInnerHTML={{ __html: displayInstructions }}
                        />
                    </div>
                )}

                {/* Current Poll Title */}
                <h1 className="text-4xl font-black text-gray-900 mb-4">{displayTitle}</h1>

                {/* Current Poll Instructions */}
                <div
                    className="text-xl font-medium text-gray-700 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: activePoll.instructions || "" }}
                />
            </div>

            <main className="max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Inner Header Removed */}

                {activePoll.type === 'multiple_choice' ? (
                    <MultipleChoiceInterface
                        poll={activePoll}
                        userId={user?.id || 'anon'}
                        nextPollId={nextPollId}
                        currentStageScore={pointsEarnedInStage}
                    />
                ) : activePoll.type === 'quad_sorting' ? (
                    <QuadGroupingInterface
                        key={activePoll.id}
                        pollId={activePoll.id}
                        objects={objects}
                    />
                ) : (
                    <VotingInterface
                        key={activePoll.id}
                        pollId={activePoll.id}
                        objects={objects}
                        sides={sides}
                    />
                )}
            </main>

            {/* Discussion Forum Module */}
            {isDiscussionEnabled && activePoll && (
                <DiscussionForum
                    pollId={activePoll.id}
                    currentUser={user ? {
                        id: user.id,
                        // @ts-ignore
                        avatar_name: profile?.avatar_name,
                        // @ts-ignore
                        avatar_image: profile?.avatar_image
                    } : undefined}
                />
            )}

        </div >
    );
}
