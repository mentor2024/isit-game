"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
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
};

type VotingInterfaceProps = {
    pollId: string;
    objects: PollObject[];
};

type AssignmentMap = Record<string, "IS" | "IT" | null>;

// --- Components ---

// 1. Draggable Word Item
function DraggableWord({ id, text }: { id: string; text: string }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { text },
    });

    const baseClasses = "flex items-center justify-center min-w-[120px] h-[60px] bg-white rounded-2xl shadow-[0_2px_0_0_rgba(0,0,0,1)] border-2 border-black z-10 px-6";

    if (isDragging) {
        return (
            <div ref={setNodeRef} className={`${baseClasses} opacity-50`}>
                <span className="text-xl font-bold text-black">{text}</span>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`${baseClasses} cursor-grab active:cursor-grabbing hover:shadow-[0_4px_0_0_rgba(0,0,0,1)] transition-all`}
        >
            <span className="text-xl font-bold text-black">{text}</span>
        </div>
    );
}

// 2. Droppable Zone (Image)
function DropZone({ side, assignedWord }: { side: "IS" | "IT"; assignedWord?: { id: string; text: string } }) {
    const { setNodeRef, isOver } = useDroppable({
        id: side,
    });

    return (
        <div ref={setNodeRef} className="flex flex-col items-center relative">

            {/* Floating Assigned Word Area */}
            <div className="h-[80px] flex flex-col items-center justify-end mb-0 z-10">
                {assignedWord && (
                    <div className="flex flex-col items-center animate-in slide-in-from-bottom-2 fade-in">
                        <DraggableWord id={assignedWord.id} text={assignedWord.text} />
                        {/* Connector Line */}
                        <div className="w-[2px] h-[60px] bg-black my-0"></div>
                    </div>
                )}
            </div>

            {/* Target Image/Circle */}
            <div
                className={`relative w-48 h-48 rounded-full border-2 bg-white flex items-center justify-center transition-all duration-300 z-0 ${isOver ? "border-black scale-105" : "border-black"
                    }`}
            >
                <img
                    src={side === "IS" ? "/is.png" : "/it.png"}
                    alt={side}
                    className="w-32 h-32 object-contain select-none pointer-events-none"
                />
            </div>
        </div>
    );
}


// --- Main Interface ---

export default function VotingInterface({ pollId, objects }: VotingInterfaceProps) {
    const [assignments, setAssignments] = useState<AssignmentMap>(() => {
        return objects.reduce((acc, obj) => ({ ...acc, [obj.id]: null }), {} as AssignmentMap);
    });

    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggedText, setDraggedText] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
        setDraggedText(event.active.data.current?.text || "");
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setDraggedText("");

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
        setLoading(true);
        setMessage("");
        const supabase = createClient();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { error: authError } = await supabase.auth.signInAnonymously();
                if (authError) throw new Error("Could not sign in. Ensure Anonymous Auth is enabled.");
            }

            const isObject = objects.find(o => assignments[o.id] === "IS");
            const itObject = objects.find(o => assignments[o.id] === "IT");

            if (!isObject || !itObject) throw new Error("Please assign both words.");

            const { error } = await supabase.rpc("vote_isit", {
                p_poll_id: pollId,
                p_is_word_id: isObject.id,
                p_it_word_id: itObject.id,
            });

            if (error) throw error;

            setMessage("Vote submitted successfully!");
        } catch (e: any) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col items-center w-full min-h-[600px] pt-12">

                {/* Unassigned Words Area */}
                <div className="h-24 flex gap-8 items-center justify-center mb-8 w-full">
                    {unassignedObjects.map(obj => (
                        <DraggableWord key={obj.id} id={obj.id} text={obj.text} />
                    ))}
                    {unassignedObjects.length > 0 && !message && (
                        <p className="absolute top-4 text-sm text-black">Drag a word onto the corresponding symbol below</p>
                    )}
                </div>

                {/* Drop Zones container */}
                <div className="flex gap-16 md:gap-40 items-end justify-center mb-24 w-full px-12">
                    <DropZone
                        side="IT"
                        assignedWord={objects.find(o => assignments[o.id] === "IT")}
                    />
                    <DropZone
                        side="IS"
                        assignedWord={objects.find(o => assignments[o.id] === "IS")}
                    />
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
                    <div className={`mt-6 px-6 py-3 rounded-xl font-bold border-2 border-black ${message.includes("Error") ? "bg-white text-black" : "bg-black text-white"}`}>
                        {message}
                    </div>
                )}

            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeId ? (
                    <div className="flex items-center justify-center min-w-[120px] h-[60px] bg-white rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,1)] border-2 border-black rotate-3 scale-105 cursor-grabbing px-6">
                        <span className="text-xl font-bold text-black">{draggedText}</span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
