"use client";

import { useState } from "react";
import { saveLevelConfig } from "@/app/admin/levels/actions";
import RichTextEditor from "@/components/RichTextEditor";
import VariableCheatSheet from "@/components/VariableCheatSheet";
import VariableActionLabel from "@/components/VariableActionLabel";

type PathConfig = {
    instructions: string;
    path1: { label: string; url: string; };
    path2: { label: string; url: string; };
};

type LevelConfig = {
    instructions: string;
    awareness_assessment?: string;
    enabled_modules: string[];
    path_selector_config?: PathConfig;
    is_linked?: boolean;
    show_interstitial?: boolean;
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
    { id: "discussion_forum", label: "Discussion Forum" },
];

export default function LevelEditorForm({
    stage,
    level,
    initialConfig,
    pollCount
}: {
    stage: number;
    level: number;
    initialConfig?: LevelConfig;
    pollCount: number;
}) {
    // Aggressive client-side cleanup
    const cleanClientHtml = (html: string | undefined | null) => {
        if (!html) return "";
        return html
            // Remove NBSP variants
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/&amp;nbsp;/g, ' ')
            // Remove newlines/spaces between tags causing "extra line breaks"
            // Be careful not to merge words: only match > whitespace <
            .replace(/>\s+</g, '><')
            // Optional: trim extra whitespace
            .trim();
    };

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Rich Text State (Cleaned on Init)
    const [instructions, setInstructions] = useState(cleanClientHtml(initialConfig?.instructions));
    const [awarenessAssessment, setAwarenessAssessment] = useState(cleanClientHtml(initialConfig?.awareness_assessment));
    const [tierAMessage, setTierAMessage] = useState(cleanClientHtml(initialConfig?.score_tiers?.[0]?.message) || "Outstanding! You are in Group A.");
    const [tierBMessage, setTierBMessage] = useState(cleanClientHtml(initialConfig?.score_tiers?.[1]?.message) || "Good effort. You are in Group B.");
    const [tierCMessage, setTierCMessage] = useState(cleanClientHtml(initialConfig?.score_tiers?.[2]?.message) || "Needs improvement. You are in Group C.");

    // Path Selector State
    const savedPathConfig = initialConfig?.path_selector_config;
    const [pathConfig, setPathConfig] = useState<PathConfig>({
        instructions: savedPathConfig?.instructions || "Choose your path...",
        path1: savedPathConfig?.path1?.label ? savedPathConfig.path1 : { label: "Next Level", url: `/stage/${stage}/level/${level + 1}` },
        path2: savedPathConfig?.path2?.label ? savedPathConfig.path2 : { label: "Bonus Image Level", url: `/stage/${stage + 1}/level/1` }
    });

    // Module State (to toggle visibility)
    const [enabledModules, setEnabledModules] = useState<string[]>(initialConfig?.enabled_modules || []);
    const isPathSelectorEnabled = enabledModules.includes("path_selector");

    const handleModuleChange = (id: string, checked: boolean) => {
        if (checked) {
            setEnabledModules([...enabledModules, id]);
        } else {
            setEnabledModules(enabledModules.filter(m => m !== id));
        }
    };


    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setMessage("");

        // Clean again on save just in case
        formData.set("instructions", cleanClientHtml(instructions));
        if (awarenessAssessment) formData.set("awareness_assessment", cleanClientHtml(awarenessAssessment));
        formData.set("tier_a_message", cleanClientHtml(tierAMessage));
        formData.set("tier_b_message", cleanClientHtml(tierBMessage));
        formData.set("tier_c_message", cleanClientHtml(tierCMessage));

        const result = await saveLevelConfig(stage, level, formData);

        if (result.success) {
            setMessage("Configuration saved successfully! ✅");
        } else {
            setMessage(`Error: ${result.error} ❌`);
        }
        setLoading(false);
    }

    return (
        <form action={handleSubmit} className="text-left max-w-2xl mx-auto">
            <VariableCheatSheet />
            {/* Instructions */}
            {/* Instructions */}
            <div className="mb-8">
                <input type="hidden" name="instructions" value={instructions} />
                <VariableActionLabel label="Level Up Instructions" value={instructions} onUpdate={setInstructions} />
                <RichTextEditor
                    value={instructions}
                    onChange={setInstructions}
                    placeholder="Enter instructions or congratulations message..."
                    heightClass="h-32"
                />
            </div>



            {/* Modules */}
            <div className="mb-10">
                <label className="block text-lg font-bold mb-4">Enabled Modules</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AVAILABLE_MODULES.map((mod) => (
                        <label key={mod.id} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-black has-[:checked]:bg-yellow-50">
                            <input
                                type="checkbox"
                                name="modules"
                                value={mod.id}
                                checked={enabledModules.includes(mod.id)}
                                onChange={(e) => handleModuleChange(mod.id, e.target.checked)}
                                className="w-5 h-5 accent-black"
                            />
                            <span className="font-bold">{mod.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Series / Linking Config */}
            <div className="mb-10 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h3 className="font-black text-xl mb-4 text-blue-900 flex items-center gap-2">
                    🔗 Level Flow & Linking
                </h3>

                <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="is_linked"
                            defaultChecked={initialConfig?.is_linked}
                            className="w-6 h-6 accent-blue-600"
                        />
                        <div>
                            <span className="font-bold text-blue-900 block">Link polls in this level as a series?</span>
                            <span className="text-sm text-blue-700">Accumulate score across all polls before showing results.</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="show_interstitial"
                            defaultChecked={initialConfig?.show_interstitial ?? true}
                            className="w-6 h-6 accent-blue-600"
                        />
                        <div>
                            <span className="font-bold text-blue-900 block">Show Interstitial Level-Up Page?</span>
                            <span className="text-sm text-blue-700">
                                If unchecked, users stay on the main screen (showing Level Complete report/form) instead of going to the transition page.
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Score Tiers Config */}
            <div className="mb-10 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-xl text-green-900 flex items-center gap-2">
                        📊 Scoring Groups (A, B, C)
                    </h3>
                    <div className="bg-black text-white px-3 py-1 rounded-lg text-sm font-bold">
                        Total Possible Points: {pollCount * (stage || 1) * (level || 1)}
                    </div>
                </div>

                <div className="bg-green-100 p-4 rounded-lg text-sm text-green-900 mb-6">
                    <p>Configure ranges for feedback. Players fall into the highest group they qualify for.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
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
                                <VariableActionLabel label="Feedback Message" value={tierAMessage} onUpdate={setTierAMessage} />
                                <RichTextEditor
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
                                <VariableActionLabel label="Feedback Message" value={tierBMessage} onUpdate={setTierBMessage} />
                                <RichTextEditor
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
                                <VariableActionLabel label="Feedback Message" value={tierCMessage} onUpdate={setTierCMessage} />
                                <RichTextEditor
                                    value={tierCMessage}
                                    onChange={setTierCMessage}
                                    placeholder="You got in Group C..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Path Selector Config */}
            {isPathSelectorEnabled && (
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
            )}

            {/* Actions */}
            <div className="flex items-center gap-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-black text-white font-bold py-4 rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                    {loading ? "Saving..." : "Save Configuration"}
                </button>
            </div>

            {message && (
                <div className={`mt-6 text-center font-bold p-4 rounded-xl ${message.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {message}
                </div>
            )}
        </form>
    );
}
