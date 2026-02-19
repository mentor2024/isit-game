"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

const VARIABLES = [
    { label: "DQ", value: "[[DQ]]", desc: "Deviance Quotient" },
    { label: "AQ", value: "[[AQ]]", desc: "Awareness Quotient" },
    { label: "Points", value: "[[PointTotal]]", desc: "Total Score" },
    { label: "Last DQ", value: "[[LastDQ]]", desc: "Prev. Poll DQ" },
    { label: "Last Score", value: "[[LastScore]]", desc: "Prev. Poll Pts" },
    { label: "Rnd Correct Pick", value: "[[RandomCorrectPick]]", desc: "Example User Pick (Right)" },
    { label: "Rnd Wrong Pick", value: "[[RandomIncorrectPick]]", desc: "Example User Pick (Wrong)" },
    { label: "Rnd Correct Poll", value: "[[RandomCorrectPoll]]", desc: "Example Poll Title (Right)" },
    { label: "Rnd Wrong Poll", value: "[[RandomIncorrectPoll]]", desc: "Example Poll Title (Wrong)" },

];

export default function VariableCheatSheet() {
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 1500);
    };

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border-2 border-black p-3 w-48 z-50 transform transition-all hover:scale-105">
            <h4 className="text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest border-b border-gray-100 pb-1">
                Variables
            </h4>
            <div className="flex flex-col gap-1">
                {VARIABLES.map((v) => (
                    <button
                        key={v.value}
                        onClick={() => handleCopy(v.value)}
                        className="group flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-lg text-left transition-colors w-full"
                        title={v.desc}
                    >
                        <div className="flex flex-col">
                            <span className="font-mono font-bold text-xs text-black">{v.value}</span>
                            <span className="text-[9px] text-gray-400 leading-none">{v.desc}</span>
                        </div>
                        <div className="text-gray-300 group-hover:text-black transition-colors">
                            {copied === v.value ? <Check size={12} /> : <Copy size={12} />}
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
                <a
                    href="/admin/documentation/variables"
                    target="_blank"
                    className="flex items-center justify-between text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors w-full px-1"
                >
                    <span>Full Documentation</span>
                    <span>↗</span>
                </a>
            </div>
        </div>
    );
}
