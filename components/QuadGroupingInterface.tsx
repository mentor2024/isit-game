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
    attributes?: any;
};

type QuadGroupingInterfaceProps = {
    pollId: string;
    objects: PollObject[];
};

type AssignmentMap = Record<string, "group_a" | "group_b" | null>;

// --- Components ---

function DraggableItem({ id, imageUrl, text }: { id: string; imageUrl?: string | null; text: string }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { imageUrl, text },
    });

    // Style
    const baseClasses = "relative cursor-grab active:cursor-grabbing hover:scale-105 transition-transform z-10";
    // If dragging, we show a ghost or hide it? standard dnd-kit pattern: opacity 50

    if (isDragging) {
        return (
            <div ref={setNodeRef} className={`${baseClasses} opacity-30`}>
                <div className="w-[150px] h-[150px] bg-gray-200 rounded-xl border-2 border-black overflow-hidden">
                    {imageUrl && <img src={imageUrl} alt={text} className="w-full h-full object-cover" />}
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={baseClasses}>
            <div className="w-[150px] h-[150px] bg-white rounded-xl shadow-[0_4px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                {imageUrl ? (
                    <img src={imageUrl} alt={text} className="w-full h-full object-cover pointer-events-none select-none" />
                ) : (
                    <div className="flex items-center justify-center h-full p-2 text-center text-sm font-bold">
                        {text}
                    </div>
                )}
            </div>
        </div>
    );
}

function DropZone({ id, title, assignments, objects }: { id: "group_a" | "group_b"; title: string; assignments: AssignmentMap; objects: PollObject[] }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    const assignedObjects = objects.filter(o => assignments[o.id] === id);

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-h-[220px] bg-gray-50 border-2 rounded-2xl flex flex-col items-center p-4 transition-colors
                ${isOver ? "border-black bg-blue-50" : "border-gray-200"}
            `}
        >
            <h3 className="font-black text-xl text-gray-400 mb-4 uppercase tracking-wider">{title}</h3>

            <div className="flex flex-wrap gap-4 justify-center w-full h-full content-start">
                {assignedObjects.map(obj => (
                    <DraggableItem key={obj.id} id={obj.id} imageUrl={obj.image_url} text={obj.text} />
                ))}
            </div>
        </div>
    );
}

export default function QuadGroupingInterface({ pollId, objects }: QuadGroupingInterfaceProps) {
    const router = useRouter();
    const dndId = useId();

    const [assignments, setAssignments] = useState<AssignmentMap>(() => {
        return objects.reduce((acc, obj) => ({ ...acc, [obj.id]: null }), {} as AssignmentMap);
    });

    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggedImage, setDraggedImage] = useState<string | null>(null);
    const [draggedText, setDraggedText] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const unassignedObjects = objects.filter(o => !assignments[o.id]);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
        setDraggedImage(event.active.data.current?.imageUrl);
        setDraggedText(event.active.data.current?.text || "");
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setDraggedImage(null);
        setDraggedText("");

        if (!over) return; // Dropped outside

        const objectId = active.id as string;
        const targetId = over.id;

        // If dropped on a valid group, assign it. 
        // If dropped "nowhere" (but inside container?) - handled by !over check.
        // If dropped on "unsorted" zone? We can make that a drop zone too if we want "unnassign" feature.
        // For now, let's assume dropping on Group A/B assigns. To unassign, maybe we need an "unsorted" zone?
        // Let's rely on the fact that if they drop it back in the top area, it clears? 
        // Actually, easiest is just to allow moving between groups.

        let newGroup: "group_a" | "group_b" | null = null;
        if (targetId === "group_a") newGroup = "group_a";
        if (targetId === "group_b") newGroup = "group_b";
        // If they drop it on the "top area", we could clear it. Let's make the top area a droppable "unsorted".

        if (targetId === "unsorted") newGroup = null;

        if (newGroup) {
            // FIX: Enforce Max 2 items per group
            const currentCount = Object.values(assignments).filter(g => g === newGroup).length;
            const isMovingWithinGroup = assignments[objectId] === newGroup;

            if (currentCount >= 2 && !isMovingWithinGroup) {
                // Determine group name for user feedback (optional console log for now)
                console.log(`[QuadGrouping] Cannot add to ${newGroup}: Group is full (max 2).`);
                return; // START REFUSAL
            }

            setAssignments(prev => ({
                ...prev,
                [objectId]: newGroup
            }));
        } else if (newGroup === null) {
            // Allow moving back to unsorted
            setAssignments(prev => ({
                ...prev,
                [objectId]: null
            }));
        }
    };

    const handleReset = () => {
        setAssignments(objects.reduce((acc, obj) => ({ ...acc, [obj.id]: null }), {} as AssignmentMap));
    };

    const handleSubmit = async () => {
        setLoading(true);
        const supabase = createClient();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { error: authError } = await supabase.auth.signInAnonymously();
                if (authError) throw new Error("Could not sign in.");
            }

            // Prepare payload
            // We need to send ALL assignments
            const payload = Object.entries(assignments).map(([objId, group]) => ({
                objectId: objId,
                side: group
            }));

            // Call Server Action
            const { submitQuadVote } = await import("@/app/(main)/poll/actions");
            const result = await submitQuadVote(pollId, payload);

            if (!result.success) throw new Error(result.error);

            setMessage("Grouped Successfully!");

            // Redirect to Next Poll if available
            // Redirect to Next Poll if available
            if (result.nextPollId) {
                router.push(`/polls/${result.nextPollId}`);
            } else if (result.levelUp) {
                // Check for Interstitial Skip
                if (!result.showInterstitial) {
                    console.log("Skipping Interstitial -> Refreshing Poll Page");
                    window.location.href = '/poll'; // Force refresh to show LevelCompleteScreen
                    return;
                }

                if (result.stage === 0) {
                    window.location.href = '/poll';
                } else {
                    window.location.href = `/levelup?stage=${result.stage}&level=${result.level}&bonus=${result.bonus || 0}&dq=${result.dq || 0}&correct=${result.correctPolls || 0}&total=${result.totalPolls || 0}&points=${result.points || 0}`;
                }
            } else {
                router.refresh();
            }

        } catch (e: any) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Top Zone Droppable (for unassigning)
    const { setNodeRef: setUnsortedRef, isOver: isOverUnsorted } = useDroppable({ id: "unsorted" });

    return (
        <DndContext id={dndId} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col w-full max-w-4xl mx-auto p-4 gap-8">

                {/* 1. Unsorted "Bank" */}
                {/* Only show if there are unsorted items, OR always show as a drop target to remove items */}
                <div
                    ref={setUnsortedRef}
                    className={`min-h-[180px] w-full border-2 border-dashed rounded-2xl flex items-center justify-center p-4 transition-colors relative
                        ${isOverUnsorted ? "border-black bg-gray-100" : "border-gray-200 bg-white"}
                    `}
                >
                    {unassignedObjects.length === 0 && (
                        <span className="text-gray-300 font-bold text-xl uppercase tracking-widest absolute">All Items Grouped</span>
                    )}

                    <div className="flex gap-4 flex-wrap justify-center z-10">
                        {unassignedObjects.map(obj => (
                            <DraggableItem key={obj.id} id={obj.id} imageUrl={obj.image_url} text={obj.text} />
                        ))}
                    </div>
                </div>

                {/* 2. Groups A & B */}
                <div className="flex gap-4 w-full md:flex-row flex-col">
                    <DropZone id="group_a" title="Group 1" assignments={assignments} objects={objects} />
                    <DropZone id="group_b" title="Group 2" assignments={assignments} objects={objects} />
                </div>

                {/* 3. Actions */}
                <div className="flex justify-center gap-4 mt-4">
                    <button
                        onClick={handleReset}
                        className="px-6 py-3 bg-white text-black border-2 border-black rounded-full font-bold hover:bg-gray-100"
                    >
                        Reset
                    </button>
                    {unassignedObjects.length === 0 && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 bg-black text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Confirm Grouping"}
                        </button>
                    )}
                </div>

                {/* Messages */}
                {message && (
                    <div className="mt-4 text-center px-6 py-3 bg-green-100 text-green-800 border-2 border-green-600 rounded-xl font-bold">
                        {message}
                    </div>
                )}
            </div>

            <DragOverlay>
                {activeId && (
                    <div className="w-[150px] h-[150px] bg-white rounded-xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black rotate-6 overflow-hidden">
                        {draggedImage ? (
                            <img src={draggedImage} alt={draggedText || "item"} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full p-2 text-center text-sm font-bold">
                                {draggedText}
                            </div>
                        )}
                    </div>
                )}
            </DragOverlay>

        </DndContext>
    );
}
