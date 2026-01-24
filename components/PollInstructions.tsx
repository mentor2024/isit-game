import React from "react";

type PollInstructionsProps = {
    text: string;
};

export function PollInstructions({ text }: PollInstructionsProps) {
    if (!text) return null;

    return (
        <div className="p-4 border border-gray-200 rounded-lg bg-white/50 text-gray-700 text-sm leading-relaxed shadow-sm">
            <h4 className="sr-only">Instructions</h4>
            <p>{text}</p>
        </div>
    );
}
