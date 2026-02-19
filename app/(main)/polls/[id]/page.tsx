import React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import { PollTwoColLayout } from "@/components/PollTwoColLayout";
import VotingInterface from "@/components/VotingInterface";
import MultipleChoiceInterface from "@/components/MultipleChoiceInterface";
import QuadGroupingInterface from "@/components/QuadGroupingInterface";
import { replaceMessageVariables } from "@/lib/messageUtils";
import { getUserMetrics } from "@/lib/metrics";

type Params = Promise<{ id: string }>;

export default async function PollPage({ params }: { params: Params }) {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // 2. Fetch Current Poll FIRST (to check stage)
    const { data: poll, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("id", id)
        .single();

    if (pollError || !poll) {
        return notFound();
    }

    // 1. Check Auth (Enforce unless Stage 0)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user && poll.stage !== 0) {
        redirect("/auth");
    }

    const { data: rawObjects, error: objError } = await supabase
        .from("poll_objects")
        .select("id, text, image_url")
        .eq("poll_id", id);

    // Shuffle objects
    const objects = rawObjects ? [...rawObjects].sort(() => Math.random() - 0.5) : [];

    // Validation depends on type
    const isQuad = poll.type === 'quad_sorting';
    const isMC = poll.type === 'multiple_choice';
    const isBinary = !isQuad && !isMC;

    if (objError || !objects) {
        if (objError || !objects) {
            return <div className="p-8 text-red-500">Error loading poll objects: {objError?.message}</div>;
        }
    }

    if (isBinary && objects.length !== 2) {
        return (
            <div className="p-8 text-red-500">
                Error: Binary poll configuration is invalid (needs exactly 2 objects).
            </div>
        );
    }

    if (isQuad && objects.length !== 4) {
        // Warn but maybe allow? Quad usually needs 4.
        // Let's be strict for now or just warn.
    }

    // --- Variable Substitution Logic ---
    let displayInstructions = poll.instructions || "";
    if (user && displayInstructions) {
        try {
            const metrics = await getUserMetrics(supabase, user.id);
            // Standalone page doesn't easy have "LastDQ" without more queries, 
            // but we can at least support the global metrics.
            displayInstructions = replaceMessageVariables(displayInstructions, {
                dq: metrics.overallDq,
                aq: metrics.aq,
                pointTotal: metrics.rawScore,
                lastDq: 0, // Fallback
                lastScore: 0 // Fallback
            });
        } catch (e) {
            console.error("Error fetching metrics for standalone poll:", e);
        }
    }
    // -----------------------------------

    // 4. Find Previous Poll (Only relevant for Binary typically, but logic can stay)
    const { data: prevPoll } = await supabase
        .from("polls")
        .select("*")
        .lt("created_at", poll.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    // 5. Calculate Previous Results (Logic tailored for Binary pairs mostly)
    let resultsPairs: { label: string; count: number }[] = [];
    let prevTitle = prevPoll?.title;
    let prevInstructions = prevPoll?.instructions;

    if (prevPoll && !isQuad && !isMC) {
        // ... (Existing Binary Result Logic) ...
        // Fetch objects for prev poll
        const { data: prevObjects } = await supabase
            .from("poll_objects")
            .select("id, text")
            .eq("poll_id", prevPoll.id);

        if (prevObjects && prevObjects.length === 2) {
            const objA = prevObjects[0];
            const objB = prevObjects[1];

            // Get count for Option 1
            const { count: countA_IS } = await supabase
                .from("poll_votes")
                .select("*", { count: "exact", head: true })
                .eq("poll_id", prevPoll.id)
                .eq("selected_object_id", objA.id)
                .eq("chosen_side", "IS");

            // Get count for Option 2
            const { count: countB_IS } = await supabase
                .from("poll_votes")
                .select("*", { count: "exact", head: true })
                .eq("poll_id", prevPoll.id)
                .eq("selected_object_id", objB.id)
                .eq("chosen_side", "IS");

            const c1 = countA_IS || 0;
            const c2 = countB_IS || 0;

            resultsPairs = [
                {
                    label: `IS: ${objA.text} / IT: ${objB.text}`,
                    count: c1
                },
                {
                    label: `IS: ${objB.text} / IT: ${objA.text}`,
                    count: c2
                }
            ];
        }
    }

    // If Quad or MC, use Full Width Centered Layout (similar to main game loop)
    if (isMC || isQuad) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-start pt-8 bg-gray-50 p-4 space-y-6">

                {/* Header Outside Card */}
                <div className="text-center w-full max-w-4xl">
                    <h1 className="text-4xl font-bold mb-4 text-gray-900">{poll.title}</h1>
                    {displayInstructions && (
                        <div
                            className="text-xl text-gray-700 font-medium [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                            dangerouslySetInnerHTML={{ __html: displayInstructions }}
                        />
                    )}
                </div>

                <main className="max-w-4xl w-full bg-white rounded-xl shadow-lg overflow-hidden p-8">
                    {/* Inner header removed */}

                    {isMC ? (
                        <MultipleChoiceInterface
                            poll={{
                                id: poll.id,
                                title: poll.title,
                                instructions: poll.instructions,
                                poll_objects: objects, // objects now has image_url directly
                                stage: poll.stage
                            }}
                            userId={user?.id || 'anon'}
                        />
                    ) : (
                        <QuadGroupingInterface
                            pollId={poll.id}
                            objects={objects} // objects now has id, text, image_url
                        />
                    )}
                </main>
            </div>
        );
    }

    return (
        <PollTwoColLayout
            prevPollTitle={prevTitle}
            prevPollInstructions={prevInstructions || undefined}
            resultsPairs={resultsPairs}
            currentPollTitle={poll.title}
            currentPollInstructions={poll.instructions}
        >
            <VotingInterface
                pollId={poll.id}
                objects={objects}
                sides={['IS', 'IT']}
            />
        </PollTwoColLayout>
    );
}
