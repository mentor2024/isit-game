import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabaseServer";
import VotingInterface from "@/components/VotingInterface";
import Link from "next/link";
import QuadGroupingInterface from "@/components/QuadGroupingInterface";
import MultipleChoiceInterface from "@/components/MultipleChoiceInterface";
import LevelCompleteScreen from "@/components/LevelCompleteScreen";
import { ChevronRight, MoveRight } from "lucide-react";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";

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
            .select('role, current_stage, current_level')
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

            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const hasServiceKey = !!serviceKey;
            console.log(`[PollPage] Has Service Key: ${hasServiceKey}`);

            if (serviceKey) {
                const serviceClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    serviceKey,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    }
                );

                const { data: votedPolls, error } = await serviceClient
                    .from("poll_votes")
                    .select("poll_id")
                    .eq("user_id", user.id);

                voteError = error;
                votedPollIds = votedPolls?.map((v: any) => v.poll_id) || [];
            } else {
                console.error("[PollPage] CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY");
                voteError = { message: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable" };
            }

            if (voteError) {
                console.error("[PollPage] Vote Fetch Error:", voteError);
            }

            console.log(`[PollPage] Voted Poll IDs count: ${votedPollIds.length}`);

            // 3. Fetch a poll NOT in that list, specific to CURRENT STAGE/LEVEL
            let query = supabase
                .from("polls")
                .select("*, poll_objects(*)")
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
        // Fallback for Anon (Stage 0 Level 1 default)
        const { data } = await supabase
            .from("polls")
            .select("*, poll_objects(*)")
            .eq('stage', 0)
            .eq('level', 1)
            .order('poll_order', { ascending: true })
            .limit(1)
            .maybeSingle();
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
        if (hasPolls && user) {
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
                    let pointsEarned = 0;
                    let bonus = 0;
                    let dq = 0;
                    let tier = 'C';

                    // Get all poll IDs for the current level to calculate score
                    const { data: allPollsInLevel } = await supabase
                        .from('polls')
                        .select('id')
                        .eq('stage', currentStage)
                        .eq('level', currentLevel);
                    const allPollIds = allPollsInLevel?.map(p => p.id) || [];

                    if (user) {
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

                        if (currentStage === 0) {
                            // Stage 0: Evaluate based on Accuracy % since points are 0
                            // 3 Groups: Top (>80%), Middle (50-79%), Bottom (<50%)
                            const accuracy = totalVotes > 0 ? (totalCorrect / totalVotes) : 0;

                            if (accuracy >= 0.8) tier = 'S';      // Group 1
                            else if (accuracy >= 0.5) tier = 'B'; // Group 2
                            else tier = 'D';                      // Group 3

                            // Points remain 0 for display
                        } else {
                            // Standard Scoring
                            pointsEarned = Math.floor((totalCorrect / 2) * currentStage * currentLevel);
                            bonus = Math.round(pointsEarned / (1 + dq));

                            const totalScore = pointsEarned + bonus;

                            // Fetch Tiers
                            const { data: tiers } = await supabase.from('level_configurations').select('score_tiers').eq('stage', currentStage).eq('level', currentLevel).single();
                            if (tiers?.score_tiers) {
                                // tiers: { S: 1000, A: 800 ... }
                                const sortedTiers = Object.entries(tiers.score_tiers).sort(([, a], [, b]) => (b as number) - (a as number));
                                for (const [t, minScore] of sortedTiers) {
                                    if (totalScore >= (minScore as number)) {
                                        tier = t;
                                        break;
                                    }
                                }
                            }
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

    if (user && votedPollIds.length > 0) {
        // Find most recent vote
        const { data: latestVote } = await supabase
            .from("poll_votes")
            .select("poll_id, is_correct, created_at, polls(title)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestVote) {
            console.log(`[PollPage] Previous Vote Found: Poll ${latestVote.poll_id}`);

            // @ts-ignore
            if (latestVote.polls) {
                // @ts-ignore
                previousPollTitle = latestVote.polls.title;
            }

            // Verify if previous poll was FULLY correct (all objects)
            const { data: pollVotes } = await supabase
                .from("poll_votes")
                .select("is_correct")
                .eq("user_id", user.id)
                .eq("poll_id", latestVote.poll_id);

            const allCorrect = pollVotes && pollVotes.length > 0 && pollVotes.every(v => v.is_correct);
            console.log(`[PollPage] All Correct: ${allCorrect} (${pollVotes?.length} votes)`);

            if (allCorrect) {
                if (activePoll.instructions_correct) {
                    displayInstructions = activePoll.instructions_correct;
                    instructionStyles = {
                        container: "bg-green-100 border-green-600",
                        text: "text-green-800",
                        title: "text-green-900"
                    };
                    console.log(`[PollPage] Showing CORRECT instructions`);
                }
            } else {
                if (activePoll.instructions_incorrect) {
                    displayInstructions = activePoll.instructions_incorrect;
                    instructionStyles = {
                        container: "bg-red-100 border-red-600",
                        text: "text-red-800",
                        title: "text-red-900"
                    };
                    console.log(`[PollPage] Showing INCORRECT instructions`);
                }
            }
        } else {
            console.log(`[PollPage] No previous vote found despite votedPollIds existing.`);
        }
    }

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

    const seedString = `${activePoll.id}-${user ? user.id : 'anon'}`;
    const rng = createSeededRandom(seedString);

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

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-4 bg-gray-50 p-4 relative space-y-4">
            <div className="w-full max-w-xl flex items-center gap-2 text-sm font-bold text-black justify-center">
                <span>{activePoll.stage === 0 ? "Stage Zero" : STAGE_NAMES[activePoll.stage - 1]}</span>
                <ChevronRight size={14} />
                <span>Level {LEVEL_LETTERS[activePoll.level - 1]}</span>
                <ChevronRight size={14} />
                <span>Poll {activePoll.poll_order}</span>
            </div>

            {/* Header Outside Card */}
            <div className="text-center w-full max-w-4xl">
                <h1 className="text-4xl font-black text-gray-900 mb-4">{displayTitle}</h1>

                {previousPollTitle && (
                    <h3 className={`font-bold text-lg mb-2 ${instructionStyles.title}`}>{previousPollTitle}</h3>
                )}

                {/* Instructions without container */}
                <p className={`text-xl font-medium ${displayInstructions === activePoll.instructions_correct ? 'text-green-700' : displayInstructions === activePoll.instructions_incorrect ? 'text-red-700' : 'text-gray-700'}`}>
                    {displayInstructions}
                </p>
            </div>

            <main className="max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Inner Header Removed */}

                {activePoll.type === 'multiple_choice' ? (
                    <MultipleChoiceInterface
                        poll={activePoll}
                        userId={user?.id || 'anon'}
                        nextPollId={nextPollId}
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
            <div className="p-4 bg-gray-50 text-center text-sm text-gray-400">
                Poll ID: {activePoll.id.slice(0, 8)}...
            </div>
        </div>
    );
}
