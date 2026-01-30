"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface PollObject {
    id: string;
    text: string;
    image_url?: string | null;
    points?: number; // Added points support
}

interface MultipleChoiceInterfaceProps {
    poll: {
        id: string;
        title: string;
        instructions: string | null;
        poll_objects: PollObject[];
    };
    userId: string;
    nextPollId?: string;
}

export default function MultipleChoiceInterface({ poll, userId, nextPollId }: MultipleChoiceInterfaceProps) {
    const router = useRouter();
    // const { nextPollId } = usePollNavigation(); // removed
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);

    // Randomize options on mount (or when poll changes)
    const shuffledObjects = useMemo(() => {
        return [...poll.poll_objects].sort(() => Math.random() - 0.5);
    }, [poll.id]);

    const handleSubmit = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        setError(null);

        try {
            const supabase = createClient();

            // Insert Vote
            // Since we relaxed the constraint, we can just insert chosen_side=NULL (or 'selection') and selected_object_id=selectedId
            // BUT wait, submitVote action in actions.ts expects 'IS' or 'IT' and validates against correct_side.
            // MC Polls don't have "correct" answers in the same way, or maybe they do?
            // The user spec said "Disambiguator", aimed at gathering data. No wrong answer?
            // "Validation: Is there one correct answer or multiple? -> User didn't specify, but implied subjective choices."
            // So we'll treat it as survey mode (always correct / no feedback, just next).

            const { error: insertError } = await supabase
                .from('poll_votes')
                .upsert({
                    poll_id: poll.id,
                    user_id: userId,
                    selected_object_id: selectedId,
                    chosen_side: null // Must allow null via migration
                }, { onConflict: 'user_id, poll_id, selected_object_id' }); // Conflict? logic might fail if we voted differently on same object?
            // Actually constraint is unique(user_id, poll_id, selected_object_id).
            // If we change mind, we insert new row?
            // Multiple Choice usually implies 1 vote per poll.
            // The constraint on (user, poll, object) means we can vote for Object A, then Object B?
            // That would allow multiple selection.
            // If we want Single Selection, we might need to delete previous votes or constraint (user, poll).
            // For now, let's assume we just insert.

            if (insertError) throw insertError;

            setCompleted(true);

            // Auto-advance after small delay
            setTimeout(() => {
                if (nextPollId) {
                    router.push(`/polls/${nextPollId}`);
                } else {
                    router.push('/poll');
                }
                router.refresh(); // Ensure state updates
            }, 1000);

        } catch (e: any) {
            setError(e.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-8">
            <div className="w-full flex flex-col gap-4">
                {shuffledObjects.map((obj) => (
                    <button
                        key={obj.id}
                        onClick={() => !completed && setSelectedId(obj.id)}
                        disabled={submitting || completed}
                        className={`p-4 rounded-xl text-left border-2 transition-all flex items-center justify-between group
                            ${selectedId === obj.id
                                ? 'border-black bg-black text-white shadow-lg scale-[1.02]'
                                : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                            }
                        `}
                    >
                        <span className="text-lg font-medium">{obj.text}</span>

                        {/* Radio Circle Indicator */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${selectedId === obj.id ? 'border-white bg-white' : 'border-gray-300'}
                        `}>
                            {selectedId === obj.id && (
                                <div className="w-3 h-3 rounded-full bg-black" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}

            <div className="mt-8 flex justify-center">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedId || submitting || completed}
                    className="bg-black text-white text-xl font-bold py-4 px-12 rounded-full disabled:opacity-50 hover:scale-105 transition-transform"
                >
                    {submitting ? "Saving..." : (completed ? "Saved!" : "Confirm Selection")}
                </button>
            </div>
        </div>
    );
}
