import React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import { PollTwoColLayout } from "@/components/PollTwoColLayout";
import BinaryAssign from "@/components/BinaryAssign";

type Params = Promise<{ id: string }>;

export default async function PollPage({ params }: { params: Params }) {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // 1. Check Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth"); // Assuming an auth page exists or path is handled
    }

    // 2. Fetch Current Poll
    const { data: poll, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("id", id)
        .single();

    if (pollError || !poll) {
        // If invalid ID
        return notFound();
    }

    // 3. Fetch Current Poll Objects
    const { data: objects, error: objError } = await supabase
        .from("poll_objects")
        .select("id, text")
        .eq("poll_id", id);

    if (objError || !objects || objects.length !== 2) {
        // Poll setup invalid
        return (
            <div className="p-8 text-red-500">
                Error: Poll configuration is invalid (needs exactly 2 objects).
            </div>
        );
    }

    // 4. Find Previous Poll
    const { data: prevPoll } = await supabase
        .from("polls")
        .select("*")
        .lt("created_at", poll.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    // 5. Calculate Previous Results (if any)
    let resultsPairs: { label: string; count: number }[] = [];
    let prevTitle = prevPoll?.title;
    let prevInstructions = prevPoll?.instructions;

    if (prevPoll) {
        // Fetch objects for prev poll
        const { data: prevObjects } = await supabase
            .from("poll_objects")
            .select("id, text")
            .eq("poll_id", prevPoll.id);

        if (prevObjects && prevObjects.length === 2) {
            const objA = prevObjects[0];
            const objB = prevObjects[1];

            // We need to count:
            // Option 1: A is IS (implies B is IT)
            // Option 2: B is IS (implies A is IT)

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

    return (
        <PollTwoColLayout
            prevPollTitle={prevTitle}
            prevPollInstructions={prevInstructions || undefined}
            resultsPairs={resultsPairs}
        >
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">{poll.title}</h1>
                {poll.instructions && (
                    <p className="text-gray-500">{poll.instructions}</p>
                )}
            </div>

            <BinaryAssign
                pollId={poll.id}
                leftWord={objects[0]}
                rightWord={objects[1]}
            />
        </PollTwoColLayout>
    );
}
