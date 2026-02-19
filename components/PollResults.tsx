import React from "react";

type PairResult = {
    label: string;
    count: number;
};

type PollResultsProps = {
    prevPollId?: string;
    prevTitle?: string;
    pairs: PairResult[];
};

export function PollResults({ prevTitle, pairs }: PollResultsProps) {
    if (!pairs || pairs.length === 0) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50 text-gray-500 text-sm italic">
                No results available yet.
            </div>
        );
    }

    // Calculate total for percentages
    const total = pairs.reduce((acc, p) => acc + p.count, 0);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Results for {prevTitle || "Previous Poll"}
            </h3>
            <div className="space-y-3">
                {pairs.map((pair, idx) => {
                    const percentage = total > 0 ? Math.round((pair.count / total) * 100) : 0;
                    return (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600 font-medium">
                                <span>{pair.label}</span>
                                <span>
                                    {pair.count} ({percentage}%)
                                </span>
                            </div>
                            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
