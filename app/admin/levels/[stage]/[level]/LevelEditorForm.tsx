"use client";

import { useState } from "react";
import { saveLevelConfig } from "@/app/admin/levels/actions";

type PathConfig = {
    instructions: string;
    path1: { label: string; url: string; };
    path2: { label: string; url: string; };
};

type LevelConfig = {
    instructions: string;
    enabled_modules: string[];
    path_selector_config?: PathConfig;
    is_linked?: boolean;
    // Removing old threshold fields in favor of score_tiers
    score_tiers?: {
        min_score: number;
        message: string;
    }[];
};

const AVAILABLE_MODULES = [
    { id: "is_it_rails", label: "IS IT Rails" },
    { id: "level_scores", label: "Level Scores (Left Rail)" },
    { id: "your_metrics", label: "Your Metrics (Right Rail)" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "aggregate_results", label: "Aggregate Poll Results" },
    { id: "path_selector", label: "Path Selector" },
];

import RichTextEditor from "@/components/RichTextEditor";

// ... (existing imports)

export default function LevelEditorForm({
    stage,
    level,
    initialConfig
}: {
    stage: number;
    level: number;
    initialConfig?: LevelConfig
}) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Rich Text State
    const [instructions, setInstructions] = useState(initialConfig?.instructions || "");
    const [tierAMessage, setTierAMessage] = useState(initialConfig?.score_tiers?.[0]?.message || "Outstanding! You are in Group A.");
    const [tierBMessage, setTierBMessage] = useState(initialConfig?.score_tiers?.[1]?.message || "Good effort. You are in Group B.");
    const [tierCMessage, setTierCMessage] = useState(initialConfig?.score_tiers?.[2]?.message || "Needs improvement. You are in Group C.");

    // ... (existing Path State)

    // ... (existing Module State)

    async function handleSubmit(formData: FormData) {
        // ... (existing handleSubmit)
    }

    return (
        <form action={handleSubmit} className="text-left max-w-2xl mx-auto">
            {/* Instructions */}
            <div className="mb-8">
                <input type="hidden" name="instructions" value={instructions} />
                <RichTextEditor
                    label="Level Up Instructions"
                    value={instructions}
                    onChange={setInstructions}
                    placeholder="Enter instructions or congratulations message..."
                />
            </div>

            {/* Modules ... (unchanged) */}

            {/* ... (Module Section code skipped for brevity unless inside replacement range) ... */}

            {/* ... (Series / Linking Config) ... */}

            <div className="grid grid-cols-1 gap-6">
                {/* Score Tiers Info */}
                <div className="bg-blue-100 p-4 rounded-lg text-sm text-blue-900">
                    <p className="font-bold mb-2">Scoring Groups (A, B, C)</p>
                    <p>Configure ranges for feedback. Players fall into the highest group they qualify for.</p>
                </div>

                {/* Group A */}
                <div className="p-4 bg-white rounded-xl border border-green-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">Highest</div>
                    <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">🏆 Group A (Top Tier)</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Score</label>
                            <input
                                type="number"
                                name="tier_a_min"
                                defaultValue={initialConfig?.score_tiers?.[0]?.min_score ?? 25}
                                className="w-full p-2 border border-gray-300 rounded font-mono"
                                min="0"
                            />
                        </div>
                        <div>
                            <input type="hidden" name="tier_a_message" value={tierAMessage} />
                            <RichTextEditor
                                label="Feedback Message"
                                value={tierAMessage}
                                onChange={setTierAMessage}
                                placeholder="You got in Group A!"
                            />
                        </div>
                    </div>
                </div>

                {/* Group B */}
                <div className="p-4 bg-white rounded-xl border border-yellow-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-bl-lg">Middle</div>
                    <h4 className="font-bold text-yellow-900 mb-4 flex items-center gap-2">⭐ Group B (Mid Tier)</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Score</label>
                            <input
                                type="number"
                                name="tier_b_min"
                                defaultValue={initialConfig?.score_tiers?.[1]?.min_score ?? 15}
                                className="w-full p-2 border border-gray-300 rounded font-mono"
                                min="0"
                            />
                        </div>
                        <div>
                            <input type="hidden" name="tier_b_message" value={tierBMessage} />
                            <RichTextEditor
                                label="Feedback Message"
                                value={tierBMessage}
                                onChange={setTierBMessage}
                                placeholder="You got in Group B!"
                            />
                        </div>
                    </div>
                </div>

                {/* Group C */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">Lowest</div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">🤔 Group C (Low Tier)</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center text-sm text-gray-500 italic">
                            Anything below Group B
                        </div>
                        <div>
                            <input type="hidden" name="tier_c_message" value={tierCMessage} />
                            <RichTextEditor
                                label="Feedback Message"
                                value={tierCMessage}
                                onChange={setTierCMessage}
                                placeholder="You got in Group C..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {/* Path Selector Config */ }
    {
        isPathSelectorEnabled && (
            <div className="mb-10 p-6 bg-gray-50 border-2 border-black rounded-xl animate-in fade-in slide-in-from-top-4">
                <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                    🔀 Path Selector Configuration
                </h3>

                <input type="hidden" name="path_selector_config" value={JSON.stringify(pathConfig)} />

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block font-bold text-sm mb-1">Selector Instructions</label>
                        <textarea
                            value={pathConfig.instructions}
                            onChange={(e) => setPathConfig({ ...pathConfig, instructions: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="e.g. Choose your destiny..."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Path 1 */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold mb-2">Path 1 (Left)</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Button Label</label>
                                    <input
                                        value={pathConfig.path1.label}
                                        onChange={(e) => setPathConfig({ ...pathConfig, path1: { ...pathConfig.path1, label: e.target.value } })}
                                        className="w-full p-2 border border-gray-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Destination URL</label>
                                    <input
                                        value={pathConfig.path1.url}
                                        onChange={(e) => setPathConfig({ ...pathConfig, path1: { ...pathConfig.path1, url: e.target.value } })}
                                        className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Path 2 */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold mb-2">Path 2 (Right)</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Button Label</label>
                                    <input
                                        value={pathConfig.path2.label}
                                        onChange={(e) => setPathConfig({ ...pathConfig, path2: { ...pathConfig.path2, label: e.target.value } })}
                                        className="w-full p-2 border border-gray-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Destination URL</label>
                                    <input
                                        value={pathConfig.path2.url}
                                        onChange={(e) => setPathConfig({ ...pathConfig, path2: { ...pathConfig.path2, url: e.target.value } })}
                                        className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    {/* Actions */ }
    <div className="flex items-center gap-4">
        <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-black text-white font-bold py-4 rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
            {loading ? "Saving..." : "Save Configuration"}
        </button>
    </div>

    {
        message && (
            <div className={`mt-6 text-center font-bold p-4 rounded-xl ${message.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {message}
            </div>
        )
    }
        </form >
    );
}
