"use client";

import { useState } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateLevelButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [stage, setStage] = useState("");
    const [level, setLevel] = useState("");
    const router = useRouter();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!stage || !level) return;

        // Navigate to the editor for this stage/level
        router.push(`/admin/levels/${stage}/${level}`);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg"
            >
                <Plus size={20} />
                Create Level
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Popover */}
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border-2 border-black p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-lg">New Level</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-black"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stage</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={stage}
                                        onChange={(e) => setStage(e.target.value)}
                                        className="w-full border-2 border-gray-200 rounded-lg p-2 font-mono font-bold focus:border-black outline-none"
                                        placeholder="#"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Level</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        className="w-full border-2 border-gray-200 rounded-lg p-2 font-mono font-bold focus:border-black outline-none"
                                        placeholder="#"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl border-2 border-black hover:bg-purple-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <span>Go to Editor</span>
                                <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
