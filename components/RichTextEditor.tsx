"use client";

import dynamic from 'next/dynamic';
import { Info, X, Copy } from 'lucide-react';
import { useState } from 'react';

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, label, placeholder }: RichTextEditorProps) {
    const [showVariables, setShowVariables] = useState(false);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list',
        'link'
    ];

    return (
        <div className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
                {label && <label className="font-bold text-gray-700">{label}</label>}
                <button
                    type="button"
                    onClick={() => setShowVariables(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-full transition-colors"
                >
                    <Info size={14} />
                    Variables
                </button>
            </div>

            <div className="bg-white text-black">
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                    className="h-64 mb-12"
                />
            </div>

            {/* Variables Helper Modal */}
            {showVariables && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-gray-100 p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Info size={20} className="text-blue-600" />
                                Available Variables
                            </h3>
                            <button
                                onClick={() => setShowVariables(false)}
                                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh] text-sm">
                            <p className="text-gray-600 mb-4">
                                You can include these dynamic variables in your text. They will be replaced with the user's actual data when displayed.
                            </p>

                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <code className="text-blue-700 font-bold text-base">[[DQ]]</code>
                                    <p className="text-gray-600 mt-1">Overall Deviance Quotient (e.g. 0.15)</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <code className="text-blue-700 font-bold text-base">[[AQ]]</code>
                                    <p className="text-gray-600 mt-1">Overall Awareness Quotient (e.g. 1250)</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <code className="text-blue-700 font-bold text-base">[[PointTotal]]</code>
                                    <p className="text-gray-600 mt-1">Total Points Accumulated (e.g. 850)</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <code className="text-amber-700 font-bold text-base">[[LastDQ]]</code>
                                    <p className="text-gray-600 mt-1">DQ from the most recently completed poll.</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <code className="text-amber-700 font-bold text-base">[[LastScore]]</code>
                                    <p className="text-gray-600 mt-1">Points earned in the most recently completed poll.</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 border-t text-right">
                            <button
                                onClick={() => setShowVariables(false)}
                                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
