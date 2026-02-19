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
    currentPollTitle?: string;
    currentPollInstructions?: string | null;
};

export function PollTwoColLayout({
    prevPollTitle,
    prevPollInstructions,
    resultsPairs,
    children,
    currentPollTitle,
    currentPollInstructions,
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
                {/* Removed 'flex justify-center' to allow full width block layout for header */}
                <main className="w-full flex flex-col items-center order-1 md:order-2 space-y-6">

                    {/* Header Outside Card */}
                    {(currentPollTitle || currentPollInstructions) && (
                        <div className="text-center w-full max-w-lg">
                            {currentPollTitle && (
                                <h1 className="text-4xl font-bold mb-4 text-gray-900">{currentPollTitle}</h1>
                            )}
                            {currentPollInstructions && (
                                <div
                                    className="text-xl text-gray-700 font-medium [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: currentPollInstructions }}
                                />
                            )}
                        </div>
                    )}

                    {/* Constrain width of the game card itself */}
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}
