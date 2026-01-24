import React from "react";
import { PollResults } from "./PollResults";
import { PollInstructions } from "./PollInstructions";

type PairResult = {
    label: string;
    count: number;
};

type PollTwoColLayoutProps = {
    prevPollTitle?: string;
    prevPollInstructions?: string;
    resultsPairs: PairResult[];
    children: React.ReactNode; // The game (BinaryAssign)
};

export function PollTwoColLayout({
    prevPollTitle,
    prevPollInstructions,
    resultsPairs,
    children,
}: PollTwoColLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {/* 
        Explicit Grid:
        - Mobile: Single column (stack)
        - Desktop: 2 columns (Left: 350px fixed or 1fr, Right: 2fr max)
        - Gap: 2rem (32px)
      */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8 items-start">

                {/* Left Column: Results & Context */}
                <aside className="space-y-6 md:sticky md:top-8 order-2 md:order-1">
                    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <PollResults
                            prevTitle={prevPollTitle}
                            pairs={resultsPairs}
                        />
                    </section>

                    {prevPollInstructions && (
                        <section>
                            <PollInstructions text={prevPollInstructions} />
                        </section>
                    )}
                </aside>

                {/* Right Column: Active Game */}
                <main className="w-full flex justify-center order-1 md:order-2">
                    {/* Constrain width of the game card itself */}
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}
