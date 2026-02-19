"use client";

import { useState, useId } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragEndEvent,
} from "@dnd-kit/core";

// --- Types ---
type PollObject = {
    id: string;
    text: string;
    image_url?: string | null;
};

type VotingInterfaceProps = {
    pollId: string;
    objects: PollObject[];
    sides: ("IS" | "IT")[];
};

type AssignmentMap = Record<string, "IS" | "IT" | null>;

// --- Components ---

// 1. Draggable Word Item (Now supports Images)
function DraggableWord({ id, text, imageUrl }: { id: string; text: string; imageUrl?: string | null }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { text, imageUrl },
    });

    // Base Style
    const baseClasses = `flex items-center justify-center bg-white shadow-[0_2px_0_0_rgba(0,0,0,1)] border-2 border-black z-10 overflow-hidden relative`;

    // Size variants
    const sizeClasses = imageUrl
        ? "w-[200px] h-[200px] rounded-xl" // Square for images (200px), no padding
        : "min-w-[120px] h-[60px] rounded-2xl px-6"; // Pill for text

    const content = imageUrl ? (
        <img src={imageUrl} alt={text} className="w-full h-full object-cover pointer-events-none select-none" />
    ) : (
        <span className="text-xl font-bold text-black pointer-events-none select-none">{text}</span>
    );

    if (isDragging) {
        return (
            <div ref={setNodeRef} className={`${baseClasses} ${sizeClasses} opacity-50`}>
                {content}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`${baseClasses} ${sizeClasses} cursor-grab active:cursor-grabbing hover:shadow-[0_4px_0_0_rgba(0,0,0,1)] transition-all`}
        >
            {content}
        </div>
    );
}

// 2. Droppable Zone (Image)
function DropZone({ side, assignedWord, hasImages }: { side: "IS" | "IT"; assignedWord?: PollObject; hasImages: boolean }) {
    const { setNodeRef, isOver } = useDroppable({
        id: side,
    });

    return (
        <div ref={setNodeRef} className="flex flex-col items-center h-full justify-between relative min-w-[160px]">

            {/* Top Slot for Assigned Word - Exact Height to ensure connector touches */}
            <div className={`w-full flex justify-center items-start ${hasImages ? "h-[200px]" : "h-[60px]"}`}>
                {assignedWord && (
                    <div className="z-10">
                        <DraggableWord id={assignedWord.id} text={assignedWord.text} imageUrl={assignedWord.image_url} />
                    </div>
                )}
            </div>

            {/* Flexible Connector Line */}
            {/* Flexible Connector Line */}
            <div className={`w-[2px] bg-black transition-all duration-300 ${assignedWord ? "opacity-100 flex-grow" : "opacity-0 flex-grow"}`}></div>

            {/* Target Image/Circle */}
            <div
                className={`w-[160px] h-[160px] md:w-[180px] md:h-[180px] rounded-full border-2 bg-white flex items-center justify-center transition-all duration-100 z-0 mb-2 ${isOver ? "border-black scale-105" : "border-black"
                    }`}
            >
                <img
                    src={side === "IS" ? "/is.png" : "/it.png"}
                    alt={side}
                    className="w-24 h-24 object-contain select-none pointer-events-none"
                />
            </div>
        </div>
    );
}


// --- Main Interface ---

export default function VotingInterface({ pollId, objects, sides }: VotingInterfaceProps) {
    const router = useRouter();
    // Check if any object has an image to determine Layout Mode (Text vs Image)
    const hasImages = objects.some(obj => obj.image_url);

    const [assignments, setAssignments] = useState<AssignmentMap>(() => {
        return objects.reduce((acc, obj) => ({ ...acc, [obj.id]: null }), {} as AssignmentMap);
    });

    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggedText, setDraggedText] = useState<string>("");
    const [draggedImage, setDraggedImage] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
        const currentData = event.active.data.current;
        setDraggedText(currentData?.text || "");
        setDraggedImage(currentData?.imageUrl || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setDraggedText("");
        setDraggedImage(null);

        if (!over) return;

        const droppedObjectId = active.id as string;
        const targetSide = over.id as "IS" | "IT";

        const otherObject = objects.find(o => o.id !== droppedObjectId);
        const otherSide = targetSide === "IS" ? "IT" : "IS";

        const newAssignments: AssignmentMap = {
            [droppedObjectId]: targetSide,
        };
        if (otherObject) {
            newAssignments[otherObject.id] = otherSide;
        }

        setAssignments(prev => ({
            ...prev,
            ...newAssignments
        }));
    };

    const handleReset = () => {
        setAssignments(objects.reduce((acc, obj) => ({ ...acc, [obj.id]: null }), {} as AssignmentMap));
        setMessage("");
    };

    const unassignedObjects = objects.filter(o => !assignments[o.id]);

    const handleSubmit = async () => {
        console.log("Submit clicked");
        setLoading(true);
        setMessage("");
        const supabase = createClient();

        try {
            console.log("Checking session...");
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.log("No session, signing in anonymously...");
                const { error: authError } = await supabase.auth.signInAnonymously();
                if (authError) throw new Error("Could not sign in.");
            }

            const isObject = objects.find(o => assignments[o.id] === "IS");
            const itObject = objects.find(o => assignments[o.id] === "IT");

            if (!isObject || !itObject) throw new Error("Please assign both words.");

            console.log("Importing action...");
            const { submitVote } = await import("@/app/(main)/poll/actions");

            console.log("Calling submitVote...");
            const result = await submitVote(pollId, isObject.id, itObject.id);
            console.log("Result:", result);

            if (!result.success) {
                throw new Error(result.error || "Submission failed");
            }

            if (result.levelUp) {
                console.log("Level Up! Redirecting...");
                setMessage("Level Complete! 🎉");
                await new Promise(r => setTimeout(r, 1000));

                // Check for Interstitial Skip
                if (!result.showInterstitial) {
                    console.log("Skipping Interstitial -> Refreshing Poll Page");
                    window.location.href = '/poll'; // Force refresh to show LevelCompleteScreen
                    return;
                }

                // For Stage 0, go directly to Home to show Calibration Results
                if (result.stage === 0) {
                    window.location.href = '/poll';
                } else {
                    window.location.href = `/levelup?stage=${result.stage}&level=${result.level}&bonus=${result.bonus || 0}&dq=${result.dq || 0}&correct=${result.correctPolls || 0}&total=${result.totalPolls || 0}&points=${result.points || 0}`;
                }
                return;
            }

            console.log("Refreshing...");
            setMessage("");
            router.refresh();

        } catch (e: any) {
            console.error("Submit Error:", e);
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const dndId = useId();

    return (
        <DndContext id={dndId} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col items-center w-full pb-8">

                {/* 3-Column Grid Layout */}
                {/* Fixed Height Container to prevent shifting */}
                {/* Text: 350px (short connectors), Images: 450px (accommodate larger items) */}
                {/* w-fit mx-auto to keep columns close together. */}
                <div className={`grid grid-cols-[1fr_auto_1fr] gap-2 w-fit mx-auto items-stretch mb-8 px-4 ${hasImages ? "h-[450px]" : "h-[350px]"}`}>

                    {/* LEFT ZONE (IS or IT) */}
                    <div className="h-full">
                        <DropZone
                            side={sides[0]}
                            assignedWord={objects.find(o => assignments[o.id] === sides[0])}
                            hasImages={hasImages}
                        />
                    </div>

                    {/* CENTER ZONE (Unassigned) */}
                    {/* Aligned to Top to match DropZone slots */}
                    <div className="flex gap-4 items-start min-w-[100px] justify-center">
                        {unassignedObjects.map(obj => (
                            <div key={obj.id} className="z-20">
                                <DraggableWord id={obj.id} text={obj.text} imageUrl={obj.image_url} />
                            </div>
                        ))}
                    </div>

                    {/* RIGHT ZONE (IT or IS) */}
                    <div className="h-full">
                        <DropZone
                            side={sides[1]}
                            assignedWord={objects.find(o => assignments[o.id] === sides[1])}
                            hasImages={hasImages}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 items-center">
                    <button
                        onClick={handleReset}
                        className="px-8 py-3 bg-white text-black border-2 border-black rounded-full text-lg font-bold hover:bg-black hover:text-white transition-colors"
                    >
                        Reset
                    </button>

                    {Object.keys(assignments).length === objects.length && !message && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 bg-black text-white text-lg font-bold rounded-full shadow-[0_4px_0_0_rgba(0,0,0,0.2)] hover:scale-105 transition-transform"
                        >
                            {loading ? "Confirming..." : "Confirm"}
                        </button>
                    )}
                </div>

                {/* Messages */}
                {message && (
                    <div className={`mt-6 px-6 py-3 rounded-xl font-bold border-2 border-black animate-in fade-in zoom-in duration-300
                        ${message.includes("Error") ? "bg-red-50 text-red-600 border-red-500" :
                            message.includes("Incorrect") ? "bg-red-500 text-white border-red-700" :
                                message.includes("Correct") ? "bg-green-500 text-white border-green-700" :
                                    "bg-black text-white"
                        }
                    `}>
                        {message}
                    </div>
                )}

            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeId ? (
                    draggedImage ? (
                        <div className="w-[200px] h-[200px] bg-white rounded-xl shadow-[0_4px_0_0_rgba(0,0,0,1)] border-2 border-black rotate-3 scale-105 cursor-grabbing overflow-hidden">
                            <img src={draggedImage} alt={draggedText} className="w-full h-full object-cover pointer-events-none select-none" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center min-w-[120px] h-[60px] bg-white rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,1)] border-2 border-black rotate-3 scale-105 cursor-grabbing px-6">
                            <span className="text-xl font-bold text-black">{draggedText}</span>
                        </div>
                    )
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
