"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { submitMCVote } from "@/app/(main)/poll/actions";

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
        stage: number;
    };
    userId: string;
    nextPollId?: string;
    currentStageScore?: number;
}

export default function MultipleChoiceInterface({ poll, userId, nextPollId, currentStageScore }: MultipleChoiceInterfaceProps) {
    const router = useRouter();
    // const { nextPollId } = usePollNavigation(); // removed
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const [shuffledObjects, setShuffledObjects] = useState<PollObject[]>([]);

    useEffect(() => {
        setShuffledObjects([...poll.poll_objects].sort(() => Math.random() - 0.5));
    }, [poll.id]);

    // State for Client-Side Override (Fixing Server Data Issues)
    const [clientObjects, setClientObjects] = useState<any[] | null>(null);
    const [clientScore, setClientScore] = useState<number>(0);
    const [loadingData, setLoadingData] = useState(false);

    // Initial objects: use client override if available, otherwise props (server)
    const effectiveObjects = clientObjects || (shuffledObjects.length > 0 ? shuffledObjects : poll.poll_objects);

    useEffect(() => {
        const loadClientData = async () => {
            const supabase = createClient();

            // 1. Ensure Auth (and get user ID)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("[MultipleChoice] No user found. Signing in anonymously...");
                await supabase.auth.signInAnonymously();
                router.refresh();
                return; // Will reload
            }

            // 2. Fetch Poll Objects (with POINTS) directly
            // This fixes the "0 Points" display issue
            const { data: pollData } = await supabase
                .from('polls')
                .select('poll_objects(id, text, points, image_url)')
                .eq('id', poll.id)
                .single();

            if (pollData?.poll_objects) {
                console.log("[MultipleChoice] Client Data Loaded:", pollData.poll_objects);
                // Shuffle logic for client data
                const objs = [...pollData.poll_objects];
                for (let i = objs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [objs[i], objs[j]] = [objs[j], objs[i]];
                }
                setClientObjects(objs);
            }

            // 3. Fetch Stage Score (Running Total) directly
            // This fixes the "Stage Score: 0" display issue
            if (poll.stage === 0) {
                // Get all Stage 0 polls
                const { data: stagePolls } = await supabase.from('polls').select('id').eq('stage', 0);
                const pollIds = stagePolls?.map(p => p.id) || [];

                if (pollIds.length > 0) {
                    const { data: votes } = await supabase
                        .from('poll_votes')
                        .select('points_earned')
                        .eq('user_id', user.id)
                        .in('poll_id', pollIds);

                    const total = votes?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;
                    setClientScore(total);
                }
            }
        };

        loadClientData();
    }, [poll.id, poll.stage, router]); // Depend on Poll ID

    const handleSubmit = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        setError(null);
        console.log("Submitting MC Vote...", selectedId);

        try {
            console.log("Calling submitMCVote...");
            // Add safety timeout
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 10000));
            const resultPromise = submitMCVote(poll.id, selectedId);

            const result = await Promise.race([resultPromise, timeoutPromise]) as any;
            console.log("Result:", result);

            if (!result.success) {
                throw new Error(result.error);
            }

            setCompleted(true);
            console.log("Vote saved. Transitioning...");

            if (result.nextPollId) {
                console.log("Going to next poll:", result.nextPollId);
                router.push(`/polls/${result.nextPollId}`);
            } else if (result.levelUp) {
                console.log("Level Up! Stage:", result.stage);

                // Check for Interstitial Skip
                if (!result.showInterstitial) {
                    console.log("Skipping Interstitial -> Refreshing Poll Page");
                    window.location.href = '/poll'; // Force refresh to show LevelCompleteScreen
                    return;
                }

                // For Stage 0, go directly to Home to show Calibration Results. For others, show Level Up Animation.
                if (result.stage === 0) {
                    window.location.href = '/poll'; // Force reload to trigger LevelCompleteScreen in PollPage
                } else {
                    window.location.href = `/levelup?stage=${result.stage}&level=${result.level}&bonus=${result.bonus || 0}&dq=${result.dq || 0}&correct=${result.correctPolls || 0}&total=${result.totalPolls || 0}&points=${result.points || 0}`;
                }
            } else {
                console.log("Returning to home...");
                router.push('/poll');
            }
            router.refresh();

        } catch (e: any) {
            console.error("MC Submit Error:", e);
            setError(e.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-8">
            <div className="w-full flex flex-col gap-4">
                {effectiveObjects.map((obj: any) => (
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
                        <div className="flex flex-col">
                            <span className="text-lg font-medium">{obj.text}</span>
                        </div>

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

            <div className="mt-8 flex flex-col items-center gap-4">
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

function DebugClientFetch({ pollId }: { pollId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIt = async () => {
            const supabase = createClient();
            const { data: poll, error } = await supabase
                .from('polls')
                .select('*, poll_objects(id, text, points)')
                .eq('id', pollId)
                .single();
            if (error) setData({ error });
            else setData(poll?.poll_objects);
            setLoading(false);
        };
        fetchIt();
    }, [pollId]);

    return (
        <details className="w-full text-xs text-left bg-blue-50 p-2 rounded mt-2 border border-blue-200">
            <summary className="font-bold text-blue-800">Client-Side Fetch (Direct DB)</summary>
            <pre className="text-blue-900">{loading ? "Loading..." : JSON.stringify(data, null, 2)}</pre>
        </details>
    );
}
