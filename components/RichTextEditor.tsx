"use client";

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-table-ui/dist/index.css';

// Dynamic import for ReactQuill
const ReactQuill = dynamic(async () => {
    const { default: RQ, Quill } = await import('react-quill-new');
    const { default: QuillTableUI } = await import('quill-table-ui');

    // Register table-ui
    Quill.register({
        'modules/tableUI': QuillTableUI
    }, true);

    // Register Divider Blot (HR)
    const BlockEmbed = Quill.import('blots/block/embed') as any;

    class DividerBlot extends BlockEmbed {
        static blotName = 'divider';
        static tagName = 'hr';

        static create(value: any) {
            const node = super.create(value);
            return node;
        }
    }
    Quill.register(DividerBlot as any);

    return RQ;
}, { ssr: false });

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    variant?: 'default' | 'simple';
    heightClass?: string;
}

export default function RichTextEditor({ value, onChange, label, placeholder, variant = 'default', heightClass }: RichTextEditorProps) {
    const [isSourceView, setIsSourceView] = useState(false);

    const modules = useMemo(() => ({
        table: true, // Enable native table module (required by tableUI)
        tableUI: true, // Enable the UI plugin
        toolbar: {
            container: variant === 'simple' ? [
                ['bold', 'italic'],
                ['link'],
                ['divider'], // Added HR
                ['clean']
            ] : [
                [{ 'header': [1, 2, 3, false] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
                [{ 'align': [] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image', 'video', 'table', 'divider'], // Added HR
                ['clean']
            ],
            handlers: {
                table: function (this: any) {
                    this.quill.getModule('table').insertTable(3, 3);
                },
                divider: function (this: any) {
                    const range = this.quill.getSelection();
                    if (range) {
                        this.quill.insertEmbed(range.index, 'divider', true);
                        this.quill.setSelection(range.index + 1);
                    }
                }
            }
        },
        clipboard: {
            matchVisual: false
        }
    }), [variant]);

    // Determine height: Explicit prop > Variant based > Default
    const finalHeightClass = heightClass || (variant === 'simple' ? 'h-32' : 'h-64');

    return (
        <div className="flex flex-col gap-2 relative">
            <style jsx global>{`
                .ql-divider {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 18 18' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='2' x2='16' y1='9' y2='9' stroke='%23444' stroke-width='2' /%3E%3C/svg%3E") !important;
                    background-size: 16px !important;
                    background-repeat: no-repeat !important;
                    background-position: center !important;
                }
            `}</style>
            <div className="flex items-center justify-between">
                {label && <label className="font-bold text-gray-700">{label}</label>}
                <button
                    type="button"
                    onClick={() => setIsSourceView(!isSourceView)}
                    className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                >
                    {isSourceView ? '👁️ Visual View' : '💻 Source Code'}
                </button>
            </div>

            <div className={`bg-white text-black quill-table-ui-container`}>
                {isSourceView ? (
                    <textarea
                        className={`w-full p-4 font-mono text-sm border border-gray-300 rounded mb-12 bg-gray-50 focus:ring-2 focus:ring-black focus:outline-none ${finalHeightClass}`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="<!-- Edit HTML directly here -->"
                    />
                ) : (
                    <ReactQuill
                        theme="snow"
                        value={value}
                        onChange={(content, delta, source, editor) => {
                            // Only update if the change comes from the user to avoid infinite loops
                            // when the cleaned value is passed back to the component
                            if (source === 'user') {
                                const clean = content
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/&amp;nbsp;/g, ' ');
                                onChange(clean);
                            }
                        }}
                        modules={modules}
                        placeholder={placeholder}
                        className={`${finalHeightClass} mb-12`}
                    />
                )}
            </div>
        </div>
    );
}
