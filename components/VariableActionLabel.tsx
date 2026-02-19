"use client";

import { useState } from "react";
import { Copy, Check, Repeat, X, Save } from "lucide-react";

interface VariableActionLabelProps {
    label: string;
    value: string;
    onUpdate?: (newValue: string) => void;
    className?: string;
}

export default function VariableActionLabel({ label, value, onUpdate, className = "" }: VariableActionLabelProps) {
    const [copied, setCopied] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);

    // Transform State
    const [newStage, setNewStage] = useState("");
    const [newLevel, setNewLevel] = useState("");
    const [newPoll, setNewPoll] = useState("");

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTransform = () => {
        if (!onUpdate) return;

        let updatedText = value;
        let changeCount = 0;

        // Regex to match [[Type-S#-L#-P#]]
        // Captures: 1=Type, 2=Stage, 3=Level, 4=Poll
        // We use a replacer function to allow selective updates
        updatedText = updatedText.replace(/\[\[([a-zA-Z0-9]+)-S(\d+)-L(\d+)-P(\d+)\]\]/g, (match, type, s, l, p) => {
            const finalS = newStage !== "" ? newStage : s;
            const finalL = newLevel !== "" ? newLevel : l;
            const finalP = newPoll !== "" ? newPoll : p;

            if (finalS !== s || finalL !== l || finalP !== p) {
                changeCount++;
            }

            return `[[${type}-S${finalS}-L${finalL}-P${finalP}]]`;
        });

        if (changeCount > 0) {
            onUpdate(updatedText);
            alert(`Updated ${changeCount} variables!`);
            setIsTransforming(false);
            setNewStage("");
            setNewLevel("");
            setNewPoll("");
        } else {
            alert("No variables matched or no changes were needed.");
        }
    };

    return (
        <div className="flex flex-col gap-2 mb-1">
            <div className="flex items-center gap-2">
                <label className={`font-bold ${className}`}>{label}</label>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        type="button"
                        className="text-gray-400 hover:text-black transition-colors p-1 rounded-md hover:bg-gray-100"
                        title="Copy Content"
                    >
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                    {onUpdate && (
                        <button
                            onClick={() => setIsTransforming(!isTransforming)}
                            type="button"
                            className={`text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50 ${isTransforming ? 'text-blue-600 bg-blue-50' : ''}`}
                            title="Bulk Update Variables"
                        >
                            <Repeat size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Transform UI */}
            {isTransforming && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm animate-in slide-in-from-top-2 fade-in">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-900 text-xs uppercase">Find & Replace Variables</span>
                        <button onClick={() => setIsTransforming(false)} className="text-blue-400 hover:text-blue-700">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">New Stage</label>
                            <input
                                type="number"
                                value={newStage}
                                onChange={(e) => setNewStage(e.target.value)}
                                placeholder="(Keep)"
                                className="w-full text-xs p-1.5 border border-blue-200 rounded text-center focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">New Level</label>
                            <input
                                type="number"
                                value={newLevel}
                                onChange={(e) => setNewLevel(e.target.value)}
                                placeholder="(Keep)"
                                className="w-full text-xs p-1.5 border border-blue-200 rounded text-center focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">New Poll</label>
                            <input
                                type="number"
                                value={newPoll}
                                onChange={(e) => setNewPoll(e.target.value)}
                                placeholder="(Keep)"
                                className="w-full text-xs p-1.5 border border-blue-200 rounded text-center focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleTransform}
                        type="button"
                        className="w-full bg-yellow-400 text-black font-black uppercase text-xs py-2 rounded-lg border-2 border-black hover:bg-yellow-500 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Save size={14} className="stroke-[3]" />
                        Apply Changes
                    </button>
                </div>
            )}
        </div>
    );
}
