'use client';

import { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';

export default function FeedbackTextCell({ text }: { text: string }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!text) return <span className="text-gray-400 italic">Empty</span>;

    // Truncate logic
    const limit = 75;
    const shouldTruncate = text.length > limit;

    let displayText = text;
    if (shouldTruncate) {
        // Find last space within the limit to avoid cutting words
        const sub = text.substring(0, limit);
        const lastSpace = sub.lastIndexOf(' ');

        // If we found a space, cut there. If not (one long word), just hard cut at limit.
        if (lastSpace > 0) {
            displayText = sub.substring(0, lastSpace) + "...";
        } else {
            displayText = sub + "...";
        }
    }

    return (
        <>
            {/* Always clickable for consistency */}
            <button
                onClick={() => setIsOpen(true)}
                className="text-left group relative w-full"
                title="Click to view full feedback"
            >
                <span className="text-sm text-gray-700 leading-relaxed font-medium group-hover:text-black transition-colors block">
                    {displayText}
                </span>
                <span className="absolute -right-4 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                    <Maximize2 size={12} />
                </span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Full Feedback</h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {text}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border-t border-gray-100 p-4 flex justify-end">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                                className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:scale-105 transition-transform"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    {/* Backdrop click to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
                </div>
            )}
        </>
    );
}
