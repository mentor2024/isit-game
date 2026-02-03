"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";

export default function LevelFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state for inputs
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [stage, setStage] = useState(searchParams.get("stage") || "");
    const [level, setLevel] = useState(searchParams.get("level") || "");
    const [pollCount, setPollCount] = useState(searchParams.get("poll_count") || "");

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const applyFilter = (name: string, value: string) => {
        router.push("?" + createQueryString(name, value));
    };

    const clearFilters = () => {
        setSearch("");
        setStage("");
        setLevel("");
        setPollCount("");
        router.push("/admin/levels");
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilter("search", search);
        }
    };

    return (
        <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8">

            {/* Search - Growing to fill space */}
            <div className="flex flex-col gap-1 flex-grow min-w-[200px]">
                <label className="text-xs font-bold text-gray-500 uppercase">Search Game Name</label>
                <div className="relative">
                    <input
                        className="border border-gray-300 rounded-lg p-2 w-full bg-white pl-8"
                        placeholder="e.g. Stage 1..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onBlur={() => applyFilter("search", search)}
                    />
                    <svg className="w-4 h-4 absolute left-2.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Stage</label>
                <select
                    className="border border-gray-300 rounded-lg p-2 w-32 bg-white"
                    value={stage}
                    onChange={(e) => {
                        setStage(e.target.value);
                        applyFilter("stage", e.target.value);
                    }}
                >
                    <option value="">All</option>
                    <option value="0">Zero</option>
                    {STAGE_NAMES.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Level</label>
                <select
                    className="border border-gray-300 rounded-lg p-2 w-24 bg-white"
                    value={level}
                    onChange={(e) => {
                        setLevel(e.target.value);
                        applyFilter("level", e.target.value);
                    }}
                >
                    <option value="">All</option>
                    {LEVEL_LETTERS.map((char, i) => (
                        <option key={i} value={i + 1}>{char}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Poll Count</label>
                <select
                    className="border border-gray-300 rounded-lg p-2 w-32 bg-white"
                    value={pollCount}
                    onChange={(e) => {
                        setPollCount(e.target.value);
                        applyFilter("poll_count", e.target.value);
                    }}
                >
                    <option value="">All</option>
                    {Array.from({ length: 21 }, (_, i) => i).map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>

            <button
                onClick={clearFilters}
                className="text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors ml-auto"
            >
                Clear Filters
            </button>
        </div>
    );
}
